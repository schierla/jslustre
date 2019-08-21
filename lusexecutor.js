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
        } else if(expr.type == "list") {
            return variables(expr.values);
        } else if (expr.type == "const") {
            return [];
        } else if (expr.type == "ident") {
            return [expr.value];
        } else if (expr.type == "op") {
            if (expr.op == "pre")
                return []; // pre does not use current variables
            else if(expr.op == "fby") 
                return variables(expr.operands[0]);
            else
                return variables(expr.operands);
        } else if (expr.type == "call") {
            return variables(expr.operands);
        } else {
            throw new ExecutionException("VariableCollectionException", "Unknown type: " + expr.type);
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

    function finalize(context, expr, values, state) {
        if (expr.type == "list") {
            for (var i = 0; i < expr.values.length; i++)
                finalize(context, expr.values[i], values, state);
        } else if (expr.type == "call") {
            for (var i = 0; i < expr.operands.length; i++)
                finalize(context, expr.operands[i], values, state);
        } else if (expr.type == "op") {
            if (expr.op == "pre")
                state[JSON.stringify(expr)] = evaluate(context, expr.operands[0], values, state)[0];
            if (expr.op == "fby")
                state[JSON.stringify(expr)] = evaluate(context, expr.operands[1], values, state)[0];
            for (var i = 0; i < expr.operands.length; i++)
                finalize(context, expr.operands[i], values, state);
        }
    }

    function evaluate(context, expr, values, state) {
        if (expr.type == "const") {
            return [expr.value];
        } else if (expr.type == "ident") {
            return [values[expr.value]];
        } else if (expr.type == "list") {
            var ret = [];
            for (var i = 0; i < expr.values.length; i++) {
                ret.push(evaluate(context, expr.values[i], values, state));
            }
            return ret;
        } else if (expr.type == "call") {
            var key = JSON.stringify(expr);
            if (!(key in state)) state[key] = {};
            var inputs = [];
            for (var i = 0; i < expr.operands.length; i++) {
                inputs.push(evaluate(context, expr.operands[i], values, state)[0]);
            }
            return step(context, expr.name, inputs, state[key])
        } else if (expr.type == "op") {

            if (expr.op == "when") {
                return evaluate(context, expr.operands[1], values, state)[0] ? evaluate(context, expr.operands[0], values, state) : [null];
            }

            if(expr.op == "pre") {
                var key = JSON.stringify(expr);
                return [state[key]];
            }

            if(expr.op == "fby") {
                var key = JSON.stringify(expr);
                if (!(key in state)) {
                    return evaluate(context, expr.operands[0], values, state);
                } else {
                    return [state[key]];
                }
            }

            var args = [];
            for (var i = 0; i < expr.operands.length; i++) {
                args.push(evaluate(context, expr.operands[i], values, state)[0]);
            }
            switch (expr.op) {
                case "?:":
                    return [args[0] ? args[1] : args[2]];
                case "=>":
                    return [!args[0] || args[1]];
                case "or":
                    return [args[0] || args[1]];
                case "xor":
                    return [args[0] ? !args[1] : args[1]];
                case "and":
                    return [args[0] && args[1]];
                case "<":
                    return [args[0] < args[1]];
                case "<=":
                    return [args[0] <= args[1]];
                case "=":
                    return [args[0] == args[1]];
                case ">=":
                    return [args[0] >= args[1]];
                case ">":
                    return [args[0] > args[1]];
                case "<>":
                    return [args[0] != args[1]];
                case "not":
                    return [!args[0]];
                case "+":
                    return [args[0] + args[1]];
                case "-":
                    return args.length == 2 ? [args[0] - args[1]] : [-args[0]];
                case "*":
                    return [args[0] * args[1]];
                case "/":
                    return [args[0] / args[1]];
                case "mod":
                    return [args[0] % args[1]];
                case "div":
                    return [Math.floor(args[0] / args[1])];
                case "->":
                    var key = JSON.stringify(expr);
                    if (!(key in state)) {
                        state[key] = true;
                        return [args[0]];
                    } else {
                        return [args[1]];
                    }
                case "current":
                    var key = JSON.stringify(expr);
                    if (args[0] != null) state[key] = args[0];
                    return [state[key]];
            }
            throw new ExecutionException("EvaluationException", "Unknown operation: " + expr.op);
        } else {
            throw new ExecutionException("EvaluationException", "Unknown expression type: " + expr.type);
        }
    }

    function step(context, nodename, inputs, state) {
        var node = context.nodes[nodename];
        var clocks = varclocks(context, nodename);

        var values = {};
        for (var name in context.consts) {
            values[name] = context.consts[name].value;
        }
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
                    missing.push(left[i]);
                    if (leftclock != null && !(leftclock in values))
                        ready = false;
                }

                var right = variables(eq.right);
                for (var j = 0; j < right.length; j++) {
                    if (!(right[j] in values))
                        ready = false;
                }

                if (ready) {
                    if (leftclock == null || values[leftclock]) {
                        var ret = evaluate(context, eq.right, values, state);
                        for (var j = 0; j < left.length; j++) {
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
            throw new ExecutionException("ExecutionException", "Cannot calculate node '" + nodename + "', circular reference in the definition of " + missing.join(", "));
        }

        for (var i = 0; i < node.body.equations.length; i++) {
            var eq = node.body.equations[i];
            if (eq.assert) {
                if (!evaluate(context, eq.assert, values, state)) {
                    throw new ExecutionException("AssertionException", "Assertion failed: " + eq.assert);
                }
            } else if (eq.right) {
                var leftclock = clocks[variables(eq.left)[0]];
                if (leftclock == null || variables[leftclock]) {
                    finalize(context, eq.right, values, state);
                }
            }
        }

        var ret = [];
        for (var i = 0; i < node.header.returns.length; i++) {
            ret.push(values[node.header.returns[i].name]);
        }

        state.values = values;
        return ret;
    }

    function ExecutionException(name, message) {
        this.name = name;
        this.message = message;
        // Use V8's native method if available, otherwise fallback
        if ("captureStackTrace" in Error)
            Error.captureStackTrace(this, ExecutionException);
        else
            this.stack = (new Error()).stack;
    }
    
    ExecutionException.prototype = Object.create(Error.prototype);
    ExecutionException.prototype.name = "ExeutionException";
    ExecutionException.prototype.constructor = ExecutionException;

    root.lusexecutor = {
        step: step
    };
})(this);
