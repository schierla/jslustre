(function (root) {
    "use strict";

    function variables(expr) {
        if (Array.isArray(expr)) {
            var ret = [];
            for (var i = 0; i < expr.length; i++) {
                var vars = variables(expr[i]);
                for (var j = 0; j < vars.length; j++) {
                    if (ret.indexOf(vars[j]) === -1)
                        ret.push(vars[j]);
                }
            }
            return ret;
        } else if (expr.type == "const") {
            return [];
        } else if (expr.type == "var") {
            return [expr.name];
        } else if (expr.type == "op") {
            if (expr.op == "pre")
                return []; // pre does not use current variables
            else if(expr.op == "fby") 
                return variables(expr.operands[0]);
            else
                return variables(expr.operands);
        } else {
            throw new ExecutionError("VariableCollectionError", 
                "Unknown type: " + expr.type, 
                expr.location
            );
        }
    }

    function varclocks(context, nodename) {
        var node = context.nodes[nodename];
        var clocks = {};
        for (var i = 0; i < node.header.params.length; i++) {
            clocks[node.header.params[i].name] = node.header.params[i].clock;
        }
        for (var name in context.consts) {
            clocks[name] = null;
        }
        for (var i = 0; i < node.header.returns.length; i++) {
            clocks[node.header.returns[i].name] = node.header.returns[i].clock;
        }
        for (var i = 0; i < node.body.locals.length; i++) {
            clocks[node.body.locals[i].name] = node.body.locals[i].clock;
        }
        return clocks;
    }

    function updateState(context, expr, values, state) {
        if (expr.type == "op") {
            if (expr.op == "pre") {
                state[expr.toString()] = evaluate(context, expr.operands[0], values, state);
            } else if (expr.op == "fby") {
                state[expr.toString()] = evaluate(context, expr.operands[1], values, state);
            } else if(expr.op == "->") {
                state[expr.toString()] = true;
            }
            for (var i = 0; i < expr.operands.length; i++) {
                updateState(context, expr.operands[i], values, state);
            }
        }
    }

    function checksize(array, size, expr) {
        if(array.length != size) {
            throw new ExecutionError("EvaluationError", 
                "Illegal number of arguments when evaluating '" + expr + "': Expected " + size + ", got " + array.length, 
                expr.location
            );
        }
    }

    function evaluate(context, expr, values, state) {
        if (expr.type == "const") {
            return [expr.value];
        } else if (expr.type == "var") {
            if(!(expr.name in values)) 
                throw new ExecutionError("ExecutionError", 
                "Variable '" + expr.name + "' is not declared.", 
                expr.location
            );    
            return [values[expr.name]];
        } else if (expr.type == "op") {

            if (expr.op == "when") {
                var cond = evaluate(context, expr.operands[1], values, state);
                checksize(cond, 1, expr);
                if(cond[0]) {
                    state[expr.toString()] = true;
                    return evaluate(context, expr.operands[0], values, state);
                } else {
                    state[expr.toString()] = false;
                    return [null];
                }
            }

            if(expr.op == "pre") {
                var key = expr.toString();
                return state[key];
            }

            if(expr.op == "fby") {
                var key = expr.toString();
                if (!(key in state)) {
                    return evaluate(context, expr.operands[0], values, state);
                } else {
                    return state[key];
                }
            }

            if(expr.op == "->") {
                var key = expr.toString();
                if(key in state) 
                    return evaluate(context, expr.operands[1], values, state);
                else
                    return evaluate(context, expr.operands[0], values, state);
            }

            var dargs = [], args = [];
            for (var i = 0; i < expr.operands.length; i++) {
                var vals = evaluate(context, expr.operands[i], values, state);
                if(vals) for(var j=0; j<vals.length; j++) args.push(vals[j]);
                dargs.push(vals);
            }

            switch (expr.op) {
                case "list": 
                    return args;
                case "call": 
                    var key = expr.toString();
                    if (!(key in state)) state[key] = {};
                    try {
                        return step(context, expr.name, args, state[key])
                    } catch(e) {
                        if(!e.location) e.location = expr.location;
                        throw e;
                    }
                case "?:":
                    checksize(dargs, 3, expr); 
                    checksize(dargs[0], 1, expr);
                    return args[0] ? dargs[1] : dargs[2];
                case "=>":
                    checksize(args, 2, expr);
                    return [!args[0] || args[1]];
                case "or":
                    checksize(args, 2, expr);
                    return [args[0] || args[1]];
                case "xor":
                    checksize(args, 2, expr);
                    return [args[0] ? !args[1] : args[1]];
                case "and":
                    checksize(args, 2, expr);
                    return [args[0] && args[1]];
                case "<":
                    checksize(args, 2, expr);
                    return [args[0] < args[1]];
                case "<=":
                    checksize(args, 2, expr);
                    return [args[0] <= args[1]];
                case "=":
                    checksize(args, 2, expr);
                    return [args[0] == args[1]];
                case ">=":
                    checksize(args, 2, expr);
                    return [args[0] >= args[1]];
                case ">":
                    checksize(args, 2, expr);
                    return [args[0] > args[1]];
                case "<>":
                    checksize(args, 2, expr);
                    return [args[0] != args[1]];
                case "not":
                    checksize(args, 1, expr);
                    return [!args[0]];
                case "+":
                    checksize(args, 2, expr);
                    return [args[0] + args[1]];
                case "-":
                    if(args.length == 1) 
                        return [-args[0]];
                    else if(args.length == 2)
                        return [args[0] - args[1]];
                    checksize(args, 2, expr);
                case "*":
                    checksize(args, 2, expr);
                    return [args[0] * args[1]];
                case "/":
                    checksize(args, 2, expr);
                    return [args[0] / args[1]];
                case "mod":
                    checksize(args, 2, expr);
                    return [args[0] % args[1]];
                case "div":
                    checksize(args, 2, expr);
                    return [Math.floor(args[0] / args[1])];
                case "current":
                    checksize(dargs, 1, expr);
                    if (args[0] != null) 
                        state[key] = dargs[0];
                    return state[key];
                case "#": 
                    var num = 0;
                    for(var i=0; i<args.length; i++) 
                        if(args[i]) num++;
                    return [num <= 1];
            }
            throw new ExecutionError("EvaluationError", 
                "Unknown operation: " + expr.op, 
                expr.location
            );
        } else {
            throw new ExecutionError("EvaluationError", 
                "Unknown expression type: " + expr.type, 
                expr.location
            );
        }
    }

    function step(context, nodename, inputs, state) {
        var node = context.nodes[nodename];
        if(!node) 
            throw new ExecutionError("ExecutionError", 
                "Node '" + nodename + "' is not defined."
            );

        var clocks = varclocks(context, nodename);

        var values = {};
        for (var name in context.consts) {
            values[name] = evaluate(context, context.consts[name].value, {}, {})[0];
        }

        if(inputs.length != node.header.params.length) 
            throw new ExecutionError("ExecutionError", 
                "Illegal argument count for '" + nodename + "': Expected " + node.header.params.length + ", got " + inputs.length + "."
            );

        for (var i = 0; i < node.header.params.length; i++) {
            values[node.header.params[i].name] = inputs[i];
        }

        var progress = true, missing = [ null ];
        while (missing.length > 0 && progress) {
            progress = false; missing = [];
            for (var i = 0; i < node.body.equations.length; i++) {
                var eq = node.body.equations[i];
                if (eq.assert)
                    continue;

                var left = variables(eq.left);
                var leftclock = clocks[left[0]];
                if (left[0] in values)
                    continue;

                var ready = true;

                for (var j = 0; j < left.length; j++) {
                    missing.push(left[j]);
                    if (leftclock != null && !(leftclock in values))
                        ready = false;
                    if(!(left[j] in clocks)) 
                        throw new ExecutionError("ExecutionError", 
                            "Variable '" + left[j] + "' is not declared.",
                            eq.left[j].location
                        );
                }

                var right = variables(eq.right);
                for (var j = 0; j < right.length; j++) {
                    if (!(right[j] in values))
                        ready = false;      
                    if(!(right[j] in clocks)) 
                        throw new ExecutionError("ExecutionError", 
                            "Variable '" + right[j] + "' is not declared.",
                            eq.right.location
                        );                                  
                }

                if (ready) {
                    if (leftclock == null || values[leftclock]) {
                        var ret = evaluate(context, eq.right, values, state);

                        if(ret === undefined) 
                            throw new ExecutionError("ExecutionError", 
                                "Result of '" + eq.right + "' is not defined.",
                                eq.right.location
                            );
                        if(ret.length != left.length) 
                            throw new ExecutionError("ExecutionError", 
                                "Incorrect result count in assignment of '" + left.join("', '") + "': Expected " + left.length + ", got " + ret.length + ".",
                                eq.right.location    
                            );

                        for (var j = 0; j < left.length; j++) {
                            if(ret[j] === undefined) 
                                throw new ExecutionError("ExecutionError", 
                                    "Result of '" + eq.right + "' is not defined.",
                                    eq.right.location
                                );
                            values[left[j]] = ret[j];
                        }
                        progress = true;
                    } else {
                        for (var j = 0; j < left.length; j++) {
                            values[left[j]] = null;
                        }
                        progress = true;
                    }
                }
            }
        }

        if (missing.length > 0) {
            throw new ExecutionError("ExecutionError", 
                "Cannot calculate node '" + nodename + "', circular reference in the definition of '" + missing.join("', '") + "'"
            );
        }

        for (var i = 0; i < node.body.equations.length; i++) {
            var eq = node.body.equations[i];
            if (eq.assert) {
                if (!evaluate(context, eq.assert, values, state)) {
                    throw new ExecutionError("AssertionError", 
                        "Assertion failed: " + eq.assert.toString(), 
                        eq.assert.location
                    );
                }
            } else if (eq.right) {
                var leftclock = clocks[variables(eq.left)[0]];
                if (leftclock == null || variables[leftclock]) {
                    updateState(context, eq.right, values, state);
                }
            }
        }

        var ret = [];
        for (var i = 0; i < node.header.returns.length; i++) {
            ret.push(values[node.header.returns[i].name]);
        }

        state._vars = values;
        return ret;
    }

    function ExecutionError(name, message, location) {
        this.name = name;
        this.message = message;
        this.location = location;
        // Use V8's native method if available, otherwise fallback
        if ("captureStackTrace" in Error)
            Error.captureStackTrace(this, ExecutionError);
        else
            this.stack = (new Error()).stack;
    }
    
    ExecutionError.prototype = Object.create(Error.prototype);
    ExecutionError.prototype.name = "ExeutionError";
    ExecutionError.prototype.constructor = ExecutionError;

    root.lusexecutor = {
        step: step
    };
})(this);
