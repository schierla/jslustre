// basic lustre grammar without arrays and records 
{
    var keywords = ["node", "function", "const", "returns", "assert", "if", "then", "else", "when", "current", "fby", "let", "tel", "or", "xor", "and", "not", "mod", "div" ]
    function mkident(name) {
        return {type: "var", name: name, toString: function() {return name; } };
    }
    function mkconst(value) {
        return {type: "const", value: value, toString: function() {return value; } };
    }
    function mkbinop(name, op1, op2) {
        return {type: "op", op: name, operands: [op1, op2], toString: function() {return op1 + " " + name + " " + op2; }};
    }
    function mkunop(name, op1) {
        return {type: "op", op: name, operands: [op1], toString: function() {return name + " " + op1; }};
    }
    function mkcond(cond, iftrue, iffalse) {
        return {type: "op", op: "?:", operands: [cond, iftrue, iffalse], toString: function() {return "if " + cond + " then " + iftrue + " else " + iffalse; }};
    }
    function mklist(values) {
        return {type: "op", op: "list", operands: values, toString: function() {return "(" + values.join(", ") + ")"; }};
    }
    function mkcall(name, ops) {
        return {type: "op", op: "call", name: name, operands: ops, toString: function() {return name + "(" + ops.join(", ") + ")"; }};
    }
}

Nodes 
    = _ decls: ( Decl _ ) + {
        var ret = {consts: {}, nodes: {}, types: {}};
        for(var i=0; i<decls.length; i++) {
            if(decls[i][0].constant) 
                for(var j=0; j<decls[i][0].constant.length; j++)
                    ret.consts[decls[i][0].constant[j].name] = decls[i][0].constant[j];
            else if(decls[i][0].node) 
                ret.nodes[decls[i][0].node.header.name] = decls[i][0].node;
            else if(decls[i][0].type) 
                for(var j=0; j<decls[i][0].type.length; j++)
                    ret.types[decls[i][0].type[j].name] = decls[i][0].type[j];
        }
        return ret;
    }

Decl 
    = constant: Const_Decl {
        return {constant: constant};
    }
    / node: Node_Decl {
        return {node: node};
    }
    / type: Type_Decl {
        return {type: type} ;
    }

Node_Decl 
    = header: Node_Header _ body: ( FN_Body ) ? {
        return {header: header, body: body}; 
    }

Node_Header 
    = type: ("node" / "function") _ name: Identifier _ "(" _ params: Var_Decl_List ? _ ")" _ "returns" _ "(" _ returns: Var_Decl_List ? _ ")" _ Pragma _ ";" {
        return {type: type, name: name, params: params == null ? [] : params, returns: returns == null ? [] : returns};
    }

Var_Decl_List 
    = decl : Var_Decl  decls: ( _ ";" _ Var_Decl ) * { 
        var ret = []; 
        for(var j=0; j<decl.length; j++)
            ret.push(decl[j]); 
        for(var i=0; i<decls.length; i++) 
            for(var j=0; j<decls[i][3].length; j++) 
                ret.push(decls[i][3][j]); 
        return ret;
    }

Var_Decl 
    = idents: Ident_List _ ":" _ type: Type clock: ( _ Declared_Clock ) ? _ Pragma {
        var ret = [];
        for(var i=0; i<idents.length; i++) 
            ret.push({name: idents[i], type: type, clock: clock != null ? clock[1] : null});
        return ret; 
    }

Declared_Clock 
    = "when" _ clock : Clock { 
        return clock; 
    }

Clock 
    = ident: Identifier { 
        return ident; 
    }

FN_Body 
    = locals: ( Local_Decl _ ) * "let" _ equations: Equation_List _ "tel" ";"? {
        var local = []; 
        for(var i=0; i<locals.length; i++) 
            for(var j=0; j < locals[i][0].length; j++)
                local.push(locals[i][0][j]); 
        return {locals: local, equations: equations };
    }

Local_Decl
    = vardecl: Local_Var_Decl  {  
        return vardecl; 
    }
    / constdecl: Local_Const_Decl { 
        return constdecl;
    }

Local_Var_Decl 
    = "var" _ decls: Var_Decl_List _ ";" { 
        return decls; 
    }

Local_Const_Decl 
    = "const" _ consts : ( One_Local_Const_Decl ) + { 
        return consts; 
    }

One_Local_Const_Decl 
    = name: Ident _ type: ( ":" _ Type _ ) ?  "=" _ value: Expression _ ";" {
        return {name: name, type: type != null ? type[2] : null, value: value}; 
    }


Identifier 
    = namespace: Ident "::" local: Ident { 
        return namespace + "::" + local; 
    } 
    / name: Ident { 
        return name; 
    }


Type
    = type: Enum_Type {
        return type; 
    }
    / type: Ident  { 
        return type; 
    }


Field_List 
    = first: Field others: ( _ "," _ Field ) * {
        var ret = [first]; 
        for(var i=0; i<others.length; i++) 
            ret.push(others[i][3]);
        return ret;
    }

Field 
    = name: Ident _ ":" _ type: Type { 
        return {name: name, type: type}; 
    }

Enum_Type 
    = "enum" _ "{" _ values : Ident_List _ "}" { 
        return {values: values} 
    };


Const_Decl 
    = "const" _ decl : ( One_Const_Decl _ ) + { 
        var ret = [];
        for(var i=0; i<decl.length; i++) 
            for(var j=0; j<decl[i][0].length; j++)
                ret.push(decl[i][0][j]);
        return ret;
    }

One_Const_Decl  
    = names: Ident_List _ ":" _ type: Type _ Pragma _ ";" { 
        var ret = []; 
        for(var i=0; i<names.length; i++) 
            ret.push({name: names[i], type: type}); 
        return ret; 
    }
    / name: Ident _ "=" _ value: Expression _ Pragma _ ";" { 
        return [{name: name, value: value }];
    }
    / name: Ident _ ":" _ type: Type _ "=" _ value: Expression Pragma _ ";" {
        return [{name: name, type: type, value: value }]; 
    }

Ident_List 
    = ident: Ident idents: (_ "," _ Ident ) * { 
        var ret = [ident]; 
        for(var i=0; i<idents.length; i++) 
            ret.push(idents[i][3]); 
        return ret; 
    }

Type_Decl
    = "type" _ types: (One_Type_Decl _ ";" ) + {
        var ret = [];
        for(var i=0; i<types.length; i++) 
            ret.push(types[i][0]);
        return ret;
    }
    
One_Type_Decl 
    = ident: Ident _ "=" _ type: Type { 
        return {name: ident, type: type }; 
    }

Equation_List 
    = equation: Eq_or_Ast equations: ( _ Eq_or_Ast ) * { 
        var ret = [equation]; 
        for(var i=0; i<equations.length; i++) 
            ret.push(equations[i][1]); 
        return ret; 
    }

Eq_or_Ast   
    = equation: Equation {
        return equation; 
    }
    / assertion: Assertion {
        return assertion;
    }

Equation 
    = left: Left_Part _ "=" _ right: Expression _ Pragma _ ";" { 
        return {left: left, right: right}; 
    }

Left_Part
    = "(" _ left: Left_List _ ")" { 
        return left; 
    }
    / left: Left_List { 
        return left; 
    }

Left_List 
    = left : Left  lefts: ( _ "," _ Left) * { 
        var ret = [left]; 
        for(var i=0; i<lefts.length; i++) 
            ret.push( lefts[i][3] ); 
        return ret; 
    }

Left 
    = ident: Identifier { 
        return mkident(ident); 
    }

Assertion 
    = "assert" _ expr: Expression _ Pragma _ ";" {
        return {assert: expr}; 
    }

Expression 
    = E1

E1_Op 
    = "->" 
    / "fby" & [^a-zA-Z0-9_] { return "fby"; }
E1 
    = left: E2 right: ( _ E1_Op _ E1 ) ? { 
        if(right != null) 
            return mkbinop(right[1], left, right[3]); 
        else 
            return left; 
    }

E2_Op 
    = "=>"
E2 
    = left: E3 right: ( _ E2_Op _ E2 ) ? { 
        if(right != null) 
            return mkbinop(right[1], left, right[3]); 
        else 
            return left; 
    }

E3_Op 
    = "or" & [^a-zA-Z0-9_] { return "or"; }
    / "xor" & [^a-zA-Z0-9_] { return "xor"; }
E3 
    = left: E4 right: ( _ E3_Op _ E3 ) ? { 
        if(right != null) 
            return mkbinop(right[1], left, right[3]); 
        else 
            return left; 
    }

E4_Op 
    = "and" & [^a-zA-Z0-9_] { return "and"; }
E4 
    = left: E5 right: ( _ E4_Op _ E4 ) ? { 
        if(right != null) 
            return mkbinop(right[1], left, right[3]); 
        else 
            return left; 
    }

E5_Op 
    = "<=" 
    / "<>"
    / "<" 
    / "="
    / ">=" 
    / ">" 
E5 
    = left: E6 right: ( _ E5_Op _ E5 ) ? { 
        if(right != null) 
            return mkbinop(right[1], left, right[3]); 
        else 
            return left; 
    }

E6_Op 
    = "not" & [^a-zA-Z0-9_] { return "not"; }
E6  
    = op: E6_Op _ right: E6 { 
        return mkunop(op, right); 
    }
    / left: E7 { 
        return left; 
    }

E7_Op 
    = "+" 
    / "-"
E7  
    = left: E8 right: ( _ E7_Op _ E8 ) * { 
        var ret = left; 
        while(right.length > 0) {
            var op = right.shift();
            ret = mkbinop(op[1], ret, op[3]); 
        }
        return ret; 
    }

E8_Op 
    = "*" 
    / "/" 
    / "mod" & [^a-zA-Z0-9_] { return "mod"; }
    / "div" & [^a-zA-Z0-9_] { return "div"; }
E8  
    = left: E9 right: ( _ E8_Op _ E9 ) * { 
        var ret = left; 
        while(right.length > 0) {
            var op = right.shift();
            ret = mkbinop(op[1], ret, op[3]); 
        }
        return ret; 
    }

E9_Op 
    = "when"
E9 
    = left: E10 right: ( _ E9_Op _ E9 ) ? { 
        if(right != null) 
            return mkbinop(right[1], left, right[3]); 
        else 
            return left; 
    }

E10_Op 
    = "-" 
    / "current" & [^a-zA-Z0-9_] { return "current"; }
    / "pre" & [^a-zA-Z0-9_] { return "pre"; }
    / "#"
E10 
    = op: E10_Op _ right: E10 { 
        return mkunop(op, right); 
    }
    / left: E11 { 
        return left;
    }

E11 
    = value: Value { 
        return mkconst(value); 
    }
    / call: Call { 
        return call; 
    }
    / ident: Identifier { 
        return mkident(ident); 
    }
    / "(" _ list: Expression_List _ ")" { 
        if(list.length == 1) 
            return list[0];
        else 
            return mklist(list); 
    }
    / "if" _ cond: Expression _ "then" _ thenexpr: Expression _ "else" _ elseexpr: Expression { 
        return mkcond(cond, thenexpr, elseexpr);
    }


Expression_List 
    = expr: Expression exprs: ( _ "," _ Expression) * {
        var ret = [expr]; 
        for(var i=0; i<exprs.length; i++) 
            ret.push(exprs[i][3]); 
        return ret;
    }

Field_Exp_List
    = expr: Field_Exp exprs: ( _ ";" _ Field_Exp ) * {
        var ret = [expr]; 
        for(var i=0; i<exprs.length; i++) 
            ret.push(exprs[i][3]); 
        return ret;
    }

Field_Exp 
    = name: Ident _ "=" _ value: Expression { 
        return {name: name, value: value}; 
    }

Call 
    = name: Identifier _ Pragma _ "(" _ operands: Expression_List ? _ ")" { 
        return mkcall(name, operands == null ? [] : operands); 
    }


Value
    = f: Floating { 
        return f; 
    }
    / i: Integer { 
        return i; 
    }
    / b: Bool { 
        return b; 
    }

Bool 
    = "true" {
        return true    
    } 
    / "false" {
        return false; 
    }

Integer 
    = [0-9]+ { 
        return parseInt(text()); 
    }

Floating 
    = [0-9]*"."[0-9]* { 
        return parseFloat(text()); 
    }

Pragma 
    = ("%" string "%") *

Ident "identifier"
    = ident: $( [a-zA-Z][a-zA-Z0-9_]* ) & { return keywords.indexOf(ident) === -1; } { 
        return ident
    }

string 
    = "\"" [^"]* "\""

_ "whitespace"
  = ( whiteSpace / lineTerminator / enclosedComment / lineComment )*

whiteSpace
  = [\t\v\f \u00A0\uFEFF]

lineTerminator
  = [\n\r]

enclosedComment
  = "/*" (!"*/" anyCharacter)* "*/"

lineComment
  = "--" (!lineTerminator anyCharacter)*

anyCharacter
  = . 
