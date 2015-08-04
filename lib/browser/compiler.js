(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.imbalang = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function(){


	// everything should be moved to this file instead
	var compiler = require('./compiler');
	var parser = compiler.parser;
	
	function tokenize(code,o){
		if(o === undefined) o = {};
		return compiler.tokenize(code,o);
	}; exports.tokenize = tokenize;
	
	function rewrite(code,o){
		if(o === undefined) o = {};
		return compiler.rewrite(code,o);
	}; exports.rewrite = rewrite;
	
	function parse(code,o){
		return compiler.parse(code,o);
	}; exports.parse = parse;
	
	function compile(code,o){
		if(o === undefined) o = {};
		return compiler.compile(code,o);
	}; exports.compile = compile;
	
	function highlight(code,o){
		if(o === undefined) o = {};
		return compiler.highlight(code,o);
	}; exports.highlight = highlight;


}())
},{"./compiler":2}],2:[function(require,module,exports){
(function (process){
(function(){


	var parser, lex, Rewriter;
	var fs = require('fs');
	var path = require('path');
	
	// var imba = require '../imba'
	var T = require('./token');
	var lexer = require('./lexer');
	var rewriter = require('./rewriter');
	module.exports.parser = parser = require('./parser').parser;
	var ast = require('./nodes');
	
	// Instantiate a Lexer for our use here.
	module.exports.lex = lex = new lexer.Lexer();
	module.exports.Rewriter = Rewriter = rewriter.Rewriter;
	
	// The real Lexer produces a generic stream of tokens. This object provides a
	// thin wrapper around it, compatible with the Jison API. We can then pass it
	// directly as a "Jison lexer".
	
	var highlighter$=require('./highlighter'), Highlighter=highlighter$.Highlighter;
	
	
	parser.lexer = lex.jisonBridge();
	parser.yy = ast; // everything is exported right here now
	
	function tokenize(code,o){
		if(o === undefined) o = {};
		try {
			lex.reset();
			return lex.tokenize(code,o);
		} catch (err) {
			throw err;
		};
	}; exports.tokenize = tokenize;
	
	function rewrite(tokens,o){
		if(o === undefined) o = {};
		var rewriter = new Rewriter();
		try {
			return rewriter.rewrite(tokens,o);
		} catch (err) {
			throw err;
		};
	}; exports.rewrite = rewrite;
	
	
	function parse(code,o){
		var tokens = code instanceof Array ? (code) : (tokenize(code,o));
		try {
			// console.log("Tokens",tokens)
			return parser.parse(tokens);
		} catch (err) {
			// console.log("ERROR",err)
			// err:message = "In {o:filename}, {err:message}" if o:filename
			if (o.filename) { err._filename = o.filename };
			throw err;
		};
	}; exports.parse = parse;
	
	
	function compile(code,o){
		if(o === undefined) o = {};
		var ast = parse(code,o);
		try {
			return ast.compile(o);
		} catch (err) {
			if (o.filename) { err._filename = o.filename };
			// err:message = "In {o:filename}, {err:message}" if o:filename
			throw err;
		};
	}; exports.compile = compile;
	
	
	function highlight(code,o){
		if(o === undefined) o = {};
		var tokens = tokenize(code,o);
		var ast = parse(tokens,o);
		var hl = new Highlighter(code,tokens,ast,o);
		return hl.process();
		// try
		// 	return ast.compile(o)
		// catch err
		// 	err:_filename = o:filename if o:filename
		// 	# err:message = "In {o:filename}, {err:message}" if o:filename
		// 	throw err
	}; exports.highlight = highlight;
	
	
	
	function run(code,pars){
		if(!pars||pars.constructor !== Object) pars = {};
		var filename = pars.filename !== undefined ? pars.filename : null;
		var main = require.main;
		// console.log "should run!"
		main.filename = process.argv[1] = (filename ? (fs.realpathSync(filename)) : ('.'));
		main.moduleCache && (main.moduleCache = {}); // removing all cache?!?
		
		var Module = require('module').Module;
		main.paths = Module._nodeModulePaths(path.dirname(filename));
		
		if (path.extname(main.filename) != '.imba' || require.extensions) {
			return main._compile(compile(code,arguments[1]),main.filename);
		} else {
			return main._compile(code,main.filename);
		};
	}; exports.run = run;
	
	if (require.extensions) {
		require.extensions['.imba'] = function(mod,filename) {
			var content = compile(fs.readFileSync(filename,'utf8'),{filename: filename});
			return mod._compile(content,filename);
		};
	};


}())
}).call(this,require('_process'))
},{"./highlighter":5,"./lexer":6,"./nodes":7,"./parser":8,"./rewriter":9,"./token":10,"_process":13,"fs":11,"module":11,"path":12}],3:[function(require,module,exports){
(function(){


	// helper for subclassing
	function subclass$(obj,sup) {
		for (var k in sup) {
			if (sup.hasOwnProperty(k)) obj[k] = sup[k];
		};
		// obj.__super__ = sup;
		obj.prototype = Object.create(sup.prototype);
		obj.__super__ = obj.prototype.__super__ = sup.prototype;
		obj.prototype.initialize = obj.prototype.constructor = obj;
	};
	
	// create separate error-types with all the logic
	
	/* @class ImbaParseError */
	function ImbaParseError(e,o){
		this.error = e;
		this.message = e.message;
		this.filename = e.filename;
		this.line = e.line;
		this._options = o || {};
		this;
	};
	
	subclass$(ImbaParseError,Error);
	exports.ImbaParseError = ImbaParseError; // export class 
	ImbaParseError.wrap = function (err){
		// what about the stacktrace?
		return new ImbaParseError(err);
	};
	
	
	
	ImbaParseError.prototype.set = function (opts){
		this._options || (this._options = {});
		for (var i=0, keys=Object.keys(opts), l=keys.length; i < l; i++){
			this._options[keys[i]] = opts[keys[i]];
		};
		return this;
	};
	
	ImbaParseError.prototype.start = function (){
		var o = this._options;
		var idx = o.pos - 1;
		var tok = o.tokens && o.tokens[idx];
		while (tok && tok._col == -1){
			tok = o.tokens[--idx];
		};
		return tok;
	};
	
	
	ImbaParseError.prototype.toJSON = function (){
		var o = this._options;
		var tok = this.start();
		// var tok = o:tokens and o:tokens[o:pos - 1]
		// var loc = tok and [tok.@loc,tok.@loc + (tok.@len or tok.@value:length)] or [0,0]
		return {warn: true,message: this.message,loc: tok.region(),col: tok._col,line: tok._line};
	};
	


}())
},{}],4:[function(require,module,exports){
(function(){


	function brace(str){
		var lines = str.match(/\n/);
		// what about indentation?
		
		if (lines) {
			return '{' + str + '\n}';
		} else {
			return '{\n' + str + '\n}';
		};
	}; exports.brace = brace;
	
	function flatten(arr){
		var out = [];
		arr.forEach(function(v) {
			return v instanceof Array ? (out.push.apply(out,flatten(v))) : (out.push(v));
		});
		return out;
	}; exports.flatten = flatten;
	
	
	function pascalCase(str){
		return str.replace(/(^|[\-\_\s])(\w)/g,function(m,v,l) {
			return l.toUpperCase();
		});
	}; exports.pascalCase = pascalCase;
	
	function camelCase(str){
		str = String(str);
		// should add shortcut out
		return str.replace(/([\-\_\s])(\w)/g,function(m,v,l) {
			return l.toUpperCase();
		});
	}; exports.camelCase = camelCase;
	
	function snakeCase(str){
		var str = str.replace(/([\-\s])(\w)/g,'_');
		return str.replace(/()([A-Z])/g,"_$1",function(m,v,l) {
			return l.toUpperCase();
		});
	}; exports.snakeCase = snakeCase;
	
	function setterSym(sym){
		return camelCase(("set-" + sym));
	}; exports.setterSym = setterSym;
	
	function quote(str){
		return '"' + str + '"';
	}; exports.quote = quote;
	
	function singlequote(str){
		return "'" + str + "'";
	}; exports.singlequote = singlequote;
	
	function symbolize(str){
		str = String(str);
		var end = str.charAt(str.length - 1);
		
		if (end == '=') {
			str = 'set' + str[0].toUpperCase() + str.slice(1,-1);
		};
		
		if (str.indexOf("-") >= 0) {
			str = str.replace(/([\-\s])(\w)/g,function(m,v,l) {
				return l.toUpperCase();
			});
		};
		
		return str;
	}; exports.symbolize = symbolize;
	
	
	function indent(str){
		return String(str).replace(/^/g,"\t").replace(/\n/g,"\n\t").replace(/\n\t$/g,"\n");
	}; exports.indent = indent;
	
	function bracketize(str,ind){
		if(ind === undefined) ind = true;
		if (ind) { str = "\n" + indent(str) + "\n" };
		return '{' + str + '}';
	}; exports.bracketize = bracketize;
	
	function parenthesize(str){
		return '(' + String(str) + ')';
	}; exports.parenthesize = parenthesize;


}())
},{}],5:[function(require,module,exports){
(function(){


	var lexer = require('./lexer');
	
	/* @class Highlighter */
	function Highlighter(code,tokens,ast,options){
		if(options === undefined) options = {};
		this._code = code;
		this._tokens = tokens;
		this._ast = ast;
		this._options = options;
		return this;
	};
	
	exports.Highlighter = Highlighter; // export class 
	
	Highlighter.prototype.__options = {name: 'options'};
	Highlighter.prototype.options = function(v){ return this._options; }
	Highlighter.prototype.setOptions = function(v){ this._options = v; return this; };
	
	
	
	Highlighter.prototype.process = function (){
		var tok;
		var marked = require('marked');
		var hljs = require('highlight.js');
		
		hljs.configure({classPrefix: ''});
		
		var mdrenderer = new marked.Renderer();
		mdrenderer.heading = function(text,level) {
			return '<h' + level + '><span>' + text + '</span></h' + level + '>';
		};
		
		marked.setOptions(
			{highlight: function(code,language) {
				console.log("highlighting here!",language);
				return hljs.highlightAuto(code).value;
			}}
		);
		
		// console.log(marked('```js\n console.log("hello"); \n```'))
		
		var str = this._code;
		var pos = this._tokens.length;
		
		var sections = [];
		
		try {
			this._ast.analyze({});
		} catch (e) {
			null;
		};
		
		var res = "";
		// should rather add onto another string instead of reslicing the same string on every iteration
		
		if (false) {
			while (tok = this._tokens[--pos]){
				if (tok._col == -1) { continue };
				var loc = tok._loc;
				var len = tok._len || tok._value.length;
				true;
				console.log(("token " + loc));
				str = str.substring(0,loc - 1) + '<a>' + str.substr(loc,len) + '</a>' + str.slice(loc + len);
			};
		};
		
		pos = 0;
		var caret = 0;
		
		var classes = {
			'+': 'op add math',
			'-': 'op sub math',
			'=': 'op eq',
			'/': 'op div math',
			'*': 'op mult math',
			'?': 'op ternary',
			',': 'comma',
			':': 'op colon',
			'.': 'op dot',
			'?.': 'op qdot',
			'[': ['s','sbl'],
			']': ['s','sbr'],
			'(': 'rb rbl',
			')': 'rb rbr',
			'compound_assign': 'op assign compound',
			'call_start': 'call rb rbl',
			'call_end': 'call rb rbr',
			'str': 'string',
			'num': 'number',
			'math': 'op math',
			'forin': 'keyword in',
			'compare': 'op compare',
			'herecomment': ['blockquote','comment'],
			'relation': 'keyword relation',
			'export': 'keyword export',
			'global': 'keyword global',
			'from': 'keyword from',
			'logic': 'keyword logic',
			'post_if': 'keyword if',
			'prop': 'keyword prop',
			'attr': 'keyword attr'
		};
		
		var OPEN = {
			'tag_start': 'tag',
			'selector_start': 'sel',
			'indent': '_indent',
			'(': 'paren',
			'{': 'curly',
			'[': 'square',
			'("': 'string'
		};
		
		var CLOSE = {
			'tag_end': 'tag',
			'selector_end': 'sel',
			'outdent': '_indent',
			')': 'paren',
			']': 'square',
			'}': 'curly',
			'")': 'string'
		};
		
		var open,close;
		
		function comments(sub){
			return sub.replace(/(\#)([^\n]*)/g,function(m,s,q) {
				// q = marked(q)
				// q = 
				q = marked.inlineLexer(q,[],{});
				return "<q><s>" + s + "</s>" + q + "</q>";
			});
		};
		
		function split(){
			this.groups().push({html: res});
			return res = "";
		};
		
		function addSection(content,pars){
			// if type == 'code'
			//	content = '<pre><code>' + content + '</code></pre>'
			if(!pars||pars.constructor !== Object) pars = {};
			var type = pars.type !== undefined ? pars.type : 'code';
			var reset = pars.reset !== undefined ? pars.reset : true;
			var section = {content: content,type: type};
			sections.push(section);
			if (reset) { res = "" };
			return section;
		};
		
		while (tok = this._tokens[pos++]){
			var next = this._tokens[pos];
			
			if (close) {
				res += "</i>";
				close = null;
			};
			
			var typ = tok._type.toLowerCase();
			loc = tok._loc;
			var val = tok._value;
			len = tok._len; // or tok.@value:length
			var meta = tok._meta;
			
			if (loc > caret) {
				var add = str.substring(caret,loc);
				res += comments(add);
				caret = loc;
			};
			
			
			close = CLOSE[typ];
			
			if (open = OPEN[typ]) {
				open = OPEN[val] || open;
				res += ("<i class='" + open + "'>");
			};
			
			// elif var close = CLOSE[typ]
			//	res += "</i>"
			//	# should close after?
			//	# either on the next 
			
			// adding some interpolators
			// if loc and val == '("'
			// 	res += '<i>'
			// elif loc and val == '")'
			// 	res += '</i>'
			
			if (len == 0 || typ == 'terminator' || typ == 'indent' || typ == 'outdent') {
				continue;
			};
			
			if (tok._col == -1) {
				continue;
			};
			
			var node = 'span';
			var content = str.substr(loc,len);
			var cls = classes[typ] || typ;
			
			if (cls instanceof Array) {
				node = cls[0];
				cls = cls[1];
			};
			
			cls = cls.split(" ");
			// console.log "adding token {tok.@type}"
			if (lexer.ALL_KEYWORDS.indexOf(typ) >= 0) {
				cls.unshift('keyword');
			};
			
			caret = loc + len;
			
			if (typ == 'identifier') {
				if (content[0] == '#') {
					cls.push('idref');
				};
				
				if (meta) {
					// console.log "META"
					if (meta.type == 'ACCESS') { cls.push('access') };
				};
			};
			
			if (tok._variable) {
				// console.log "IS VARIABLEREF",tok.@value
				cls.push('_lvar');
				cls.push("ref-" + tok._variable._ref);
			};
			
			if (typ == 'herecomment') {
				addSection(res); // resetting
				
				// content = content.replace(/(^\s*###\n*|\n*###\s*$)/g,'<s>$1</s>')
				content = content.replace(/(^\s*###[\s\n]*|[\n\s]*###\s*$)/g,'');
				// console.log("converting to markdown",content)
				content = marked(content,{renderer: mdrenderer});
				res += '<s>###</s>' + content + '<s>###</s>';
				addSection(res,{type: 'comment'});
				continue;
				// console.log("converted",content)
				// content = marked(content)
			};
			
			if (typ == 'string') {
				content = content.replace(/(^['"]|['"]$)/g,function(m) {
					return '<s>' + m + '</s>';
				});
			};
			
			res += ("<" + node + " class='" + (cls.join(" ")) + "'>") + content + ("</" + node + ">");
			
			
			// true
			// console.log "token {loc}"
			// str = str.substring(0,loc - 1) + '<a>' + str.substr(loc,len) + '</a>' + str.slice(loc + len)
		};
		
		if (caret < str.length - 1) {
			res += comments(str.slice(caret));
		};
		
		// split # convert to group?
		
		var json = {sections: []};
		
		addSection(res,{type: 'code'});
		
		var html = '';
		// html += '<code>'
		
		if (this.options().json) {
			return sections;
		};
		
		for (var i=0, len_=sections.length, section; i < len_; i++) {
			section = sections[i];var out = section.content;
			typ = {code: 'code',comment: 'blockquote'}[section.type] || 'div';
			html += ("<" + typ + " class='" + (section.type) + " imbalang'>") + out + ("</" + typ + ">");
			// html += section:content # '<pre><code>' + group:html + '</code></pre>'
		};
		// html += '</code>'
		
		if (!(this.options().bare)) {
			html = '<link rel="stylesheet" href="imba.css" media="screen"></link><script src="imba.js"></script>' + html + '<script src="hl.js"></script>';
		};
		
		return html;
	};
	


}())
},{"./lexer":6,"highlight.js":15,"marked":141}],6:[function(require,module,exports){
(function(){


	function idx$(a,b){
		return (b && b.indexOf) ? b.indexOf(a) : [].indexOf.call(a,b);
	};
	
	function iter$(a){ return a ? (a.toArray ? a.toArray() : a) : []; };
	// helper for subclassing
	function subclass$(obj,sup) {
		for (var k in sup) {
			if (sup.hasOwnProperty(k)) obj[k] = sup[k];
		};
		// obj.__super__ = sup;
		obj.prototype = Object.create(sup.prototype);
		obj.__super__ = obj.prototype.__super__ = sup.prototype;
		obj.prototype.initialize = obj.prototype.constructor = obj;
	};
	
	var ALL_KEYWORDS;
	// externs;
	
	var T = require('./token');
	var Token = T.Token;
	
	var rw = require('./rewriter');
	var Rewriter = rw.Rewriter;
	var INVERSES = rw.INVERSES;
	
	var K = 0;
	
	var ERR = require('./errors');
	
	// Constants
	// ---------
	
	// Keywords that Imba shares in common with JavaScript.
	var JS_KEYWORDS = [
		'true','false','null','this',
		'new','delete','typeof','in','instanceof',
		'throw','break','continue','debugger',
		'if','else','switch','for','while','do','try','catch','finally',
		'class','extends','super','module','return'
	];
	
	// We want to treat return like any regular call for now
	// Must be careful to throw the exceptions in AST, since the parser
	// wont
	
	// Imba-only keywords. var should move to JS_Keywords
	// some words (like tokid) should be context-specific
	var IMBA_KEYWORDS = [
		'undefined','then','unless','until','loop','of','by',
		'when','def','tag','do','elif','begin','var','let','self','await','import'
	];
	
	var IMBA_CONTEXTUAL_KEYWORDS = ['extend','static','local','export','global','prop'];
	
	var IMBA_ALIAS_MAP = {
		'and': '&&',
		'or': '||',
		'is': '==',
		'isnt': '!=',
		'not': '!',
		'yes': 'true',
		'no': 'false',
		'isa': 'instanceof',
		'case': 'switch',
		'nil': 'null'
	};
	
	var IMBA_ALIASES = Object.keys(IMBA_ALIAS_MAP);
	IMBA_KEYWORDS = IMBA_KEYWORDS.concat(IMBA_ALIASES); // .concat(IMBA_CONTEXTUAL_KEYWORDS)
	// var ALL_KEYWORDS = JS_KEYWORDS.concat(IMBA_KEYWORDS)
	// FixedArray for performance
	module.exports.ALL_KEYWORDS = ALL_KEYWORDS = [
		'true','false','null','this',
		'new','delete','typeof','in','instanceof',
		'throw','break','continue','debugger',
		'if','else','switch','for','while','do','try','catch','finally',
		'class','extends','super','module','return',
		'undefined','then','unless','until','loop','of','by',
		'when','def','tag','do','elif','begin','var','let','self','await','import',
		'and','or','is','isnt','not','yes','no','isa','case','nil'
	];
	
	// The list of keywords that are reserved by JavaScript, but not used, or are
	// used by Imba internally. We throw an error when these are encountered,
	// to avoid having a JavaScript error at runtime.  # 'var', 'let', - not inside here
	var RESERVED = ['case','default','function','void','with','const','enum','native'];
	var STRICT_RESERVED = ['case','function','void','const'];
	
	// The superset of both JavaScript keywords and reserved words, none of which may
	// be used as identifiers or properties.
	var JS_FORBIDDEN = JS_KEYWORDS.concat(RESERVED);
	
	var METHOD_IDENTIFIER = /^((([\x23]?[\$A-Za-z_\x7f-\uffff][$\-\w\x7f-\uffff]*)([\=\!]?))|(<=>|\|(?![\|=])))/;
	// removed ~=|~| |&(?![&=])
	
	// Token matching regexes.
	// added hyphens to identifiers now - to test
	var IDENTIFIER = /^((\$|@@|@|\#)[\wA-Za-z_\-\x7f-\uffff][$\w\x7f-\uffff]*(\-[$\w\x7f-\uffff]+)*|[$A-Za-z_][$\w\x7f-\uffff]*(\-[$\w\x7f-\uffff]+)*)([^\n\S]*:(?![\*\=:$\w\x7f-\uffff]))?/;
	
	var OBJECT_KEY = /^((\$|@@|@|)[$A-Za-z_\x7f-\uffff\-][$\w\x7f-\uffff\-]*)([^\n\S\s]*:(?![\*\=:$\w\x7f-\uffff]))/;
	
	
	var OBJECT_KEY_ESCAPE = /[\-\@\$]/;
	
	
	var PROPERTY = /^((set|get|on)\s+)?([$A-Za-z_\x7f-\uffff][$\w\x7f-\uffff\:]*)([^\n\S]*:\s)/;
	
	
	var TAG = /^(\<|%)(?=[A-Za-z\#\.\{\@])/;
	
	var TAG_TYPE = /^(\w[\w\d]*:)?(\w[\w\d]*)(-[\w\d]+)*/;
	var TAG_ID = /^#((\w[\w\d]*)(-[\w\d]+)*)/;
	
	var TAG_ATTR = /^([\.\:]?[\w\_]+([\-\:][\w]+)*)(\s)*\=/;
	
	var SELECTOR = /^([%\$]{1,2})([\(\w\#\.\[])/;
	var SELECTOR_PART = /^(\#|\.|:|::)?([\w]+(\-[\w]+)*)/;
	var SELECTOR_COMBINATOR = /^ (\+|\>|\~)*\s*(?=[\w\.\#\:\{\*\[])/;
	
	var SELECTOR_PSEUDO_CLASS = /^(::?)([\w]+(\-[\w]+)*)/;
	var SELECTOR_ATTR_OP = /^(\$=|\~=|\^=|\*=|\|=|=|\!=)/;
	var SELECTOR_ATTR = /^\[([\w\_\-]+)(\$=|\~=|\^=|\*=|\|=|=|\!=)/;
	
	var SYMBOL = /^\:((([\*\@$\w\x7f-\uffff]+)+([\-\\/\\\:][\w\x7f-\uffff]+)*[!\?\=]?)|==|\<=\>|\[\]|\[\]\=|\*|[\\/,\\])/;
	
	
	var NUMBER = /^0x[\da-f]+|^0b[01]+|^\d*\.?\d+(?:e[+-]?\d+)?/i;
	
	var HEREDOC = /^("""|''')([\s\S]*?)(?:\n[^\n\S]*)?\1/;
	
	var OPERATOR = /^(?:[-=]=>|===|->|!==|[-+*\/%<>&|^!?=]=|=<|>>>=?|([-+:])\1|([&|<>])\2=?|\?\.|\?\:|\.{2,3}|\*(?=[a-zA-Z\_]))/;
	
	// FIXME splat should only be allowed when the previous thing is spaced or inside call?
	
	var WHITESPACE = /^[^\n\S]+/;
	
	var COMMENT = /^###([^#][\s\S]*?)(?:###[^\n\S]*|(?:###)?$)/;
	// COMMENT    = /^###([^#][\s\S]*?)(?:###[^\n\S]*|(?:###)?$)|^(?:\s*(#\s.*|#\s*$))+/
	var INLINE_COMMENT = /^(\s*)(#[ \t](.*)|#[ \t]?(?=\n|$))+/;
	
	var CODE = /^[-=]=>/;
	
	var MULTI_DENT = /^(?:\n[^\n\S]*)+/;
	
	var SIMPLESTR = /^'[^\\']*(?:\\.[^\\']*)*'/;
	
	var JSTOKEN = /^`[^\\`]*(?:\\.[^\\`]*)*`/;
	
	// Regex-matching-regexes.
	var REGEX = /^(\/(?![\s=])[^[\/\n\\]*(?:(?:\\[\s\S]|\[[^\]\n\\]*(?:\\[\s\S][^\]\n\\]*)*])[^[\/\n\\]*)*\/)([imgy]{0,4})(?!\w)/;
	
	var HEREGEX = /^\/{3}([\s\S]+?)\/{3}([imgy]{0,4})(?!\w)/;
	
	var HEREGEX_OMIT = /\s+(?:#.*)?/g;
	
	// Token cleaning regexes.
	var MULTILINER = /\n/g;
	
	var HEREDOC_INDENT = /\n+([^\n\S]*)/g;
	
	var HEREDOC_ILLEGAL = /\*\//;
	
	// expensive?
	var LINE_CONTINUER = /^\s*(?:,|\??\.(?![.\d])|::)/;
	
	var TRAILING_SPACES = /\s+$/;
	
	var CONST_IDENTIFIER = /^[A-Z]/;
	
	var ARGVAR = /^\$\d$/;
	
	// CONDITIONAL_ASSIGN = ['||=', '&&=', '?=', '&=', '|=', '!?=']
	
	// Compound assignment tokens.
	var COMPOUND_ASSIGN = ['-=','+=','/=','*=','%=','||=','&&=','?=','<<=','>>=','>>>=','&=','^=','|=','=<'];
	
	// Unary tokens.
	var UNARY = ['!','~','NEW','TYPEOF','DELETE'];
	
	// Logical tokens.
	var LOGIC = ['&&','||','&','|','^'];
	
	// Bit-shifting tokens.
	var SHIFT = ['<<','>>','>>>'];
	
	// Comparison tokens.
	var COMPARE = ['===','!==','==','!=','<','>','<=','>=','===','!=='];
	
	// Overideable methods
	var OP_METHODS = ['<=>','<<','..'];
	
	// Mathematical tokens.
	var MATH = ['*','/','%','∪','∩','√'];
	
	// Relational tokens that are negatable with `not` prefix.
	var RELATION = ['IN','OF','INSTANCEOF','ISA'];
	
	// Boolean tokens.
	var BOOL = ['TRUE','FALSE','NULL','UNDEFINED'];
	
	// Our list is shorter, due to sans-parentheses method calls.
	var NOT_REGEX = ['NUMBER','REGEX','BOOL','TRUE','FALSE','++','--',']'];
	
	// If the previous token is not spaced, there are more preceding tokens that
	// force a division parse:
	var NOT_SPACED_REGEX = ['NUMBER','REGEX','BOOL','TRUE','FALSE','++','--',']',')','}','THIS','SELF','IDENTIFIER','STRING'];
	
	// Tokens which could legitimately be invoked or indexed. An opening
	// parentheses or bracket following these tokens will be recorded as the start
	// of a function invocation or indexing operation.
	// really?!
	
	var UNFINISHED = ['\\','.','?.','?:','UNARY','MATH','+','-','SHIFT','RELATION','COMPARE','LOGIC','COMPOUND_ASSIGN','THROW','EXTENDS'];
	
	// } should not be callable anymore!!! '}', '::',
	var CALLABLE = ['IDENTIFIER','STRING','REGEX',')',']','THIS','SUPER','TAG_END','IVAR','GVAR','SELF','CONST','NEW','ARGVAR','SYMBOL','RETURN'];
	// var INDEXABLE = CALLABLE.concat 'NUMBER', 'BOOL', 'TAG_SELECTOR', 'IDREF', 'ARGUMENTS','}' # are booleans indexable? really?
	// optimize for FixedArray
	var INDEXABLE = [
		'IDENTIFIER','STRING','REGEX',')',']','THIS','SUPER','TAG_END','IVAR','GVAR','SELF','CONST','NEW','ARGVAR','SYMBOL','RETURN',
		'NUMBER','BOOL','TAG_SELECTOR','IDREF','ARGUMENTS','}'
	];
	
	// console.log NOT_SPACED_REGEX:length
	
	var GLOBAL_IDENTIFIERS = ['global','exports','require'];
	
	// STARTS = [']',')','}','TAG_ATTRS_END']
	// ENDS = [']',')','}','TAG_ATTRS_END']
	
	// Tokens that, when immediately preceding a `WHEN`, indicate that the `WHEN`
	// occurs at the start of a line. We disambiguate these from trailing whens to
	// avoid an ambiguity in the grammar.
	var LINE_BREAK = ['INDENT','OUTDENT','TERMINATOR'];
	
	
	/* @class LexerError */
	function LexerError(message,file,line){
		this.message = message;
		this.file = file;
		this.line = line;
		return this;
	};
	
	subclass$(LexerError,SyntaxError);
	exports.LexerError = LexerError; // export class 
	
	
	
	
	function last(array,back){
		if(back === undefined) back = 0;
		return array[array.length - back - 1];
	};
	
	function countOld(str,substr){
		console.log(("count number of in strin " + (str.length)));
		var num = 0;
		var pos = 0;
		if (!(substr.length)) {
			return 1 / 0;
		};
		
		while (pos = 1 + str.indexOf(substr,pos)){
			num++;
		};
		return num;
	};
	
	function count(str,substr){
		return str.split(substr).length - 1;
	};
	
	function repeatString(str,times){
		var res = '';
		while (times > 0){
			if (times % 2 == 1) {
				res += str;
			};
			str += str;
			times >>= 1;
		};
		return res;
	};
	
	var tT = T.typ;
	var tV = T.val;
	var tTs = T.setTyp;
	var tVs = T.setVal;
	
	// The Lexer class reads a stream of Imba and divvies it up into tokidged
	// tokens. Some potential ambiguity in the grammar has been avoided by
	// pushing some extra smarts into the Lexer.
	
	// Based on the original lexer.coffee from CoffeeScript
	/* @class Lexer */
	function Lexer(){
		this.reset();
		this;
	};
	
	exports.Lexer = Lexer; // export class 
	
	
	Lexer.prototype.reset = function (){
		this._code = null;
		this._chunk = null; // The remainder of the source code.
		this._opts = null;
		
		this._indent = 0; // The current indentation level.
		this._indebt = 0; // The over-indentation at the current level.
		this._outdebt = 0; // The under-outdentation at the current level.
		
		this._indents = []; // The stack of all current indentation levels.
		this._ends = []; // The stack for pairing up tokens.
		this._contexts = []; // suplements @ends
		this._scopes = [];
		this._nextScope = null; // the scope to add on the next indent
		// should rather make it like a statemachine that moves from CLASS_DEF to CLASS_BODY etc
		// Things should compile differently when you are in a CLASS_BODY than when in a DEF_BODY++
		
		this._tokens = []; // Stream of parsed tokens in the form `['TYPE', value, line]`.
		this._seenFor = false;
		
		this._line = 0; // The current line.
		this._col = 0;
		this._loc = 0;
		this._locOffset = 0;
		
		this._end = null;
		this._char = null;
		this._bridge = null;
		this._last = null;
		this._lastTyp = '';
		this._lastVal = null;
		return this;
	};
	
	Lexer.prototype.jisonBridge = function (jison){
		return this._bridge = {
			lex: T.lex,
			setInput: function(tokens) {
				this.tokens = tokens;
				return this.pos = 0;
			},
			
			upcomingInput: function() {
				return "";
			}
		};
	};
	
	
	Lexer.prototype.tokenize = function (code,o){
		
		var tok;
		if(o === undefined) o = {};
		if (code.length == 0) {
			return [];
		};
		
		// console.log "code is {code}"
		// if true # !o:inline
		if (WHITESPACE.test(code)) {
			console.log("is empty?");
			code = ("\n" + code);
			if (code.match(/^\s*$/g)) { return [] };
		};
		
		code = code.replace(/\r/g,'').replace(TRAILING_SPACES,'');
		
		this._last = null;
		this._lastTyp = null;
		this._lastVal = null;
		
		this._code = code; // The remainder of the source code.
		this._opts = o;
		this._line = o.line || 0; // The current line.
		this._locOffset = o.loc || 0;
		// what about col here?
		
		// @indent  = 0 # The current indentation level.
		// @indebt  = 0 # The over-indentation at the current level.
		// @outdebt = 0 # The under-outdentation at the current level.
		// @indents = [] # The stack of all current indentation levels.
		// @ends    = [] # The stack for pairing up tokens.
		// @tokens  = [] # Stream of parsed tokens in the form `['TYPE', value, line]`.
		// @char = nil
		
		if (o.profile) { console.time("tokenize:lexer") };
		this.parse(code);
		if (!(o.inline)) this.closeIndentation();
		if (tok = this._ends.pop()) { this.error(("missing " + tok)) };
		if (o.profile) { console.timeEnd("tokenize:lexer") };
		if (o.rewrite == false || o.norewrite) { return this._tokens };
		return new Rewriter().rewrite(this._tokens,o);
	};
	
	Lexer.prototype.parse = function (code){
		var i = 0;
		var pi = 0;
		var ln = this._line;
		// @chunk = code
		
		while (this._chunk = code.slice(i)){
			if (this._line != ln) {
				this._col = this._colOffset || 0;
				ln = this._line;
			};
			
			this._loc = this._locOffset + i;
			pi = (this._end == 'TAG' && this.tagDefContextToken()) || (this._inTag && this.tagContextToken()) || this.basicContext();
			this._col += pi;
			i += pi;
		};
		
		return;
	};
	
	
	Lexer.prototype.basicContext = function (){
		return this.selectorToken() || this.symbolToken() || this.methodNameToken() || this.identifierToken() || this.whitespaceToken() || this.lineToken() || this.commentToken() || this.heredocToken() || this.tagToken() || this.stringToken() || this.numberToken() || this.regexToken() || this.jsToken() || this.literalToken() || 0;
	};
	
	Lexer.prototype.moveCaret = function (i){
		this._loc += i;
		return this._col += i;
	};
	
	
	Lexer.prototype.context = function (){
		return this._ends[this._ends.length - 1];
	};
	
	Lexer.prototype.inContext = function (key){
		var o = this._contexts[this._contexts.length - 1];
		return o && o[key];
	};
	
	Lexer.prototype.pushEnd = function (val){
		// console.log "pushing end",val
		this._ends.push(val);
		this._contexts.push(null);
		this._end = val;
		this.refreshScope();
		return this;
	};
	
	Lexer.prototype.popEnd = function (val){
		this._ends.pop();
		this._contexts.pop();
		this._end = this._ends[this._ends.length - 1];
		this.refreshScope();
		return this;
	};
	
	Lexer.prototype.refreshScope = function (){
		var ctx0 = this._ends[this._ends.length - 1];
		var ctx1 = this._ends[this._ends.length - 2];
		return this._inTag = ctx0 == 'TAG_END' || (ctx1 == 'TAG_END' && ctx0 == 'OUTDENT');
	};
	
	
	
	Lexer.prototype.queueScope = function (val){
		// console.log("pushing scope {val} - {@indents} {@indents:length}")
		// @scopes.push(val) # no no
		this._scopes[this._indents.length] = val;
		return this;
	};
	
	Lexer.prototype.popScope = function (val){
		this._scopes.pop();
		return this;
	};
	
	Lexer.prototype.getScope = function (){
		return this._scopes[this._indents.length - 1];
	};
	
	Lexer.prototype.scope = function (sym,opts){
		var len = this._ends.push(this._end = sym);
		this._contexts.push(opts || null);
		return sym;
	};
	
	
	Lexer.prototype.closeSelector = function (){
		if (this._end == '%') {
			this.token('SELECTOR_END','%',0);
			return this.pair('%');
		};
	};
	
	
	Lexer.prototype.openDef = function (){
		return this.pushEnd('DEF');
	};
	
	
	Lexer.prototype.closeDef = function (){
		if (this.context() == 'DEF') {
			var pop;
			var prev = last(this._tokens);
			// console.log "close def {prev}"
			// console.log('closeDef with last>',prev)
			if (tT(prev) == 'DEF_FRAGMENT') {
				true;
			} else {
				if (tT(prev) == 'TERMINATOR') {
					// console.log "here?!??"
					pop = this._tokens.pop();
				};
				
				this.token('DEF_BODY','DEF_BODY',0);
				if (pop) { this._tokens.push(pop) };
			};
			
			
			this.pair('DEF');
		};
		return;
	};
	
	Lexer.prototype.tagContextToken = function (){
		var match;
		if (match = TAG_ATTR.exec(this._chunk)) {
			// console.log 'TAG_SDDSATTR IN tokid',match
			// var prev = last @tokens
			// if the prev is a terminator, we dont really need to care?
			if (this._lastTyp != 'TAG_NAME') {
				if (this._lastTyp == 'TERMINATOR') {
					// console.log('prev was terminator -- drop it?')
					true;
				} else {
					this.token(",",",");
				};
			};
			
			var l = match[0].length;
			
			this.token('TAG_ATTR',match[1],l - 1); // add to loc?
			this._loc += l - 1;
			this.token('=','=',1);
			return l;
		};
		return 0;
	};
	
	Lexer.prototype.tagDefContextToken = function (){
		// console.log "tagContextToken"
		var match;
		if (match = TAG_TYPE.exec(this._chunk)) {
			this.token('TAG_TYPE',match[0],match[0].length);
			return match[0].length;
		};
		
		if (match = TAG_ID.exec(this._chunk)) {
			var input = match[0];
			this.token('TAG_ID',input,input.length);
			return input.length;
		};
		
		return 0;
	};
	
	
	Lexer.prototype.tagToken = function (){
		var match, ary;
		if (!(match = TAG.exec(this._chunk))) { return 0 };
		var ary=iter$(match);var input = ary[0],type = ary[1],identifier = ary[2];
		
		if (type == '<') {
			this.token('TAG_START','<',1);
			this.pushEnd(INVERSES.TAG_START);
			
			if (identifier) {
				if (identifier.substr(0,1) == '{') {
					return type.length;
				} else {
					this.token('TAG_NAME',input.substr(1),0);
				};
			};
		};
		
		return input.length;
	};
	
	
	Lexer.prototype.selectorToken = function (){
		var ary, string;
		var match;
		
		// special handling if we are in this context
		if (this._end == '%') {
			var chr = this._chunk.charAt(0);
			var open = this.inContext('open');
			
			// should add for +, ~ etc
			// should maybe rather look for the correct type of character?
			
			if (open && (chr == ' ' || chr == '\n' || chr == ',' || chr == '+' || chr == '~' || chr == ')' || chr == ']')) {
				// console.log "close this selector directly"
				this.token('SELECTOR_END','%',0);
				this.pair('%');
				return 0;
			};
			
			if (match = SELECTOR_COMBINATOR.exec(this._chunk)) {
				
				this.token('SELECTOR_COMBINATOR',match[1] || " ");
				return match[0].length;
			} else if (match = SELECTOR_PART.exec(this._chunk)) {
				var type = match[1];
				var id = match[2];
				
				switch (type) {
					case '.':
						tokid = 'SELECTOR_CLASS';break;
					
					case '#':
						tokid = 'SELECTOR_ID';break;
					
					case ':':
						tokid = 'SELECTOR_PSEUDO_CLASS';break;
					
					case '::':
						tokid = 'SELECTOR_PSEUDO_CLASS';break;
					
					default:
					
						var tokid = 'SELECTOR_TAG';
				
				};
				
				this.token(tokid,match[2],match[0].length);
				return match[0].length;
			} else if (chr == '[') {
				this.token('[','[',1);
				this.pushEnd(']');
				if (match = SELECTOR_ATTR.exec(this._chunk)) {
					this.token('IDENTIFIER',match[1],0);
					this.token('SELECTOR_ATTR_OP',match[2],0);
					return match[0].length;
				};
				return 1;
			} else if (chr == '|') {
				var tok = this._tokens[this._tokens.length - 1];
				tTs(tok,'SELECTOR_NS');
				// tok[0] = 'SELECTOR_NS' # FIX
				return 1;
			} else if (chr == ',') {
				this.token('SELECTOR_GROUP',',',1);
				return 1;
			} else if (chr == '*') {
				this.token('UNIVERSAL_SELECTOR','*',1);
				return 1;
			} else if (chr == ')') {
				this.pair('%');
				this.token('SELECTOR_END',')',1);
				return 1;
			} else if (idx$(chr,[')','}',']','']) >= 0) {
				// console.log "here, no??? {chr}"
				// should we pair it BEFORE the closing ')'
				this.pair('%');
				return 0;
			};
			
			// how to get out of the scope?
		};
		
		
		if (!(match = SELECTOR.exec(this._chunk))) { return 0 };
		var ary=iter$(match);var input = ary[0],id = ary[1],kind = ary[2];
		
		// this is a closed selector
		if (kind == '(') {
			// token '(','('
			this.token('SELECTOR_START',id);
			// self.pushEnd(')') # are we so sure about this?
			this.pushEnd('%');
			
			// @ends.push ')'
			// @ends.push '%'
			return id.length + 1;
		} else if (id == '%') {
			// we are already scoped in on a selector
			if (this.context() == '%') { return 1 };
			this.token('SELECTOR_START',id);
			// this is a separate - scope. Full selector should rather be $, and keep the single selector as %
			
			this.scope('%',{open: true});
			// @ends.push '%'
			// make sure a terminator breaks out
			return id.length;
		} else {
			return 0;
		};
		
		if ((id == '%' || id == '$') && ['%','$','@','(','['].indexOf(chr) >= 0) {
			var idx = 2;
			
			
			// VERY temporary way of solving this
			if ((chr == '%' || chr == '$' || chr == '@')) {
				id += chr;
				idx = 3;
				chr = this._chunk.charAt(2);
			};
			
			
			if (chr == '(') {
				if (!(string = this.balancedSelector(this._chunk,')'))) { return 0 };
				if (0 < string.indexOf('{',1)) {
					this.token('SELECTOR',id);
					this.interpolateString(string.slice(idx,-1));
					return string.length;
				} else {
					this.token('SELECTOR',id);
					this.token('(','(');
					this.token('STRING','"' + string.slice(idx,-1) + '"');
					this.token(')',')');
					return string.length;
				};
			} else if (chr == '[') {
				this.token('SELECTOR',id);
				return 1;
				// token '[','['
				// @ends.push ''
			};
		} else {
			return 0;
		};
	};
	
	// is this really needed? Should be possible to
	// parse the identifiers and = etc i jison?
	// what is special about methodNameToken? really?
	Lexer.prototype.methodNameToken = function (){
		// we can optimize this by after a def simply
		// fetching all the way after the def until a space or (
		// and then add this to the def-token itself (as with fragment)
		
		if (this._chunk.charAt(0) == ' ') { return 0 };
		
		var match;
		// var outerctx = @ends[@ends:length - 2]
		// var innerctx = @ends[@ends:length - 1]
		
		if (this._end == ')') {
			var outerctx = this._ends[this._ends.length - 2];
			// weird assumption, no?
			// console.log 'context is inside!!!'
			if (outerctx == '%' && (match = TAG_ATTR.exec(this._chunk))) {
				this.token('TAG_ATTR_SET',match[1]);
				return match[0].length;
			};
		};
		
		if (!(match = METHOD_IDENTIFIER.exec(this._chunk))) {
			return 0;
		};
		// var prev = last @tokens
		var length = match[0].length;
		
		var id = match[0];
		var ltyp = this._lastTyp;
		var typ = 'IDENTIFIER';
		var pre = id.charAt(0);
		var space = false;
		
		var m4 = match[4]; // might be out of bounds? should rather check charAt
		// drop match 4??
		
		// should this not quit here in practically all cases?
		if (!((ltyp == '.' || ltyp == 'DEF') || (m4 == '!' || m4 == '?') || match[5])) {
			return 0;
		};
		
		// again, why?
		if (id == 'self' || id == 'this' || id == 'super') { // in ['SELF','THIS']
			return 0;
		};
		
		if (id == 'new') {
			typ = 'NEW';
		};
		
		if (id == '...' && [',','(','CALL_START','BLOCK_PARAM_START','PARAM_START'].indexOf(ltyp) >= 0) {
			return 0;
		};
		
		if (id == '|') {
			// hacky way to implement this
			// with new lexer we'll use { ... } instead, and assume object-context,
			// then go back and correct when we see the context is invalid
			if (ltyp == '(' || ltyp == 'CALL_START') {
				this.token('DO','DO',0);
				this.pushEnd('|');
				// @ends.push '|'
				this.token('BLOCK_PARAM_START',id,0);
				return length;
			} else if (ltyp == 'DO' || ltyp == '{') {
				// @ends.push '|'
				this.pushEnd('|');
				this.token('BLOCK_PARAM_START',id,0);
				return length;
			} else if (this._ends[this._ends.length - 1] == '|') {
				this.token('BLOCK_PARAM_END','|',0);
				this.pair('|');
				return length;
			} else {
				return 0;
			};
		};
		
		// whaat?
		// console.log("method identifier",id)
		if ((['&','^','<<','<<<','>>'].indexOf(id) >= 0 || (id == '|' && this.context() != '|'))) {
			return 0;
		};
		
		if (OP_METHODS.indexOf(id) >= 0) {
			space = true;
		};
		
		// not even anything we should use?!?
		if (pre == '@') {
			typ = 'IVAR';
		} else if (pre == '$') {
			typ = 'GVAR';
		} else if (pre == '#') {
			typ = 'TAGID';
		} else if (CONST_IDENTIFIER.test(pre) || id == 'require' || id == 'global' || id == 'exports') {
			// really? seems very strange
			// console.log('global!!',typ,id)
			typ = 'CONST';
		};
		
		// what is this really for?
		if (match[5] && ['IDENTIFIER','CONST','GVAR','CVAR','IVAR','SELF','THIS',']','}',')','NUMBER','STRING','IDREF'].indexOf(ltyp) >= 0) {
			this.token('.','.',0);
		};
		
		this.token(typ,id,length);
		
		if (space) {
			this._last.spaced = true;
		};
		
		return length;
	};
	
	
	Lexer.prototype.inTag = function (){
		var len = this._ends.length;
		if (len > 0) {
			var ctx0 = this._ends[len - 1];
			var ctx1 = len > 1 ? (this._ends[len - 2]) : (ctx0);
			return ctx0 == 'TAG_END' || (ctx1 == 'TAG_END' && ctx0 == 'OUTDENT');
		};
		return false;
	};
	
	Lexer.prototype.isKeyword = function (id){
		if ((id == 'attr' || id == 'prop')) {
			var scop = this.getScope();
			var incls = scop == 'CLASS' || scop == 'TAG';
			// var scopes = @indents.map(|ind,i| @scopes[i] or 'NONE')
			// console.log "id is prop: {scopes.join(" -> ")} | {@indents.join(" -> ")}"
			if (incls) { return true };
		};
		
		// if incls and (id == 'attr' or id == 'prop')
		// 	return true
		
		// if id == 'prop' or id == 'attr'
		// 	# console.log "is prop keyword?? {scop}"
		// 	return false unless scop == 'CLASS' or scop == 'TAG'
		
		return ALL_KEYWORDS.indexOf(id) >= 0;
	};
	
	// Matches identifying literals: variables, keywords, method names, etc.
	// Check to ensure that JavaScript reserved words aren't being used as
	// identifiers. Because Imba reserves a handful of keywords that are
	// allowed in JavaScript, we're careful not to tokid them as keywords when
	// referenced as property names here, so you can still do `jQuery.is()` even
	// though `is` means `===` otherwise.
	Lexer.prototype.identifierToken = function (){
		var ary;
		var match;
		
		var ctx0 = this._ends[this._ends.length - 1];
		var ctx1 = this._ends[this._ends.length - 2];
		var innerctx = ctx0;
		var typ;
		var reserved = false;
		
		var addLoc = false;
		var inTag = ctx0 == 'TAG_END' || (ctx1 == 'TAG_END' && ctx0 == 'OUTDENT');
		
		// console.log ctx1,ctx0
		
		if (inTag && (match = TAG_ATTR.exec(this._chunk))) {
			// console.log 'TAG_ATTR IN tokid',match
			// var prev = last @tokens
			// if the prev is a terminator, we dont really need to care?
			if (this._lastTyp != 'TAG_NAME') {
				if (this._lastTyp == 'TERMINATOR') {
					// console.log('prev was terminator -- drop it?')
					true;
				} else {
					this.token(",",",");
				};
			};
			
			var l = match[0].length;
			
			this.token('TAG_ATTR',match[1],l - 1); // add to loc?
			this._loc += l - 1;
			this.token('=','=',1);
			return l;
		};
		
		// see if this is a plain object-key
		// way too much logic going on here?
		// the ast should normalize whether keys
		// are accessable as keys or strings etc
		if (match = OBJECT_KEY.exec(this._chunk)) {
			var id = match[1];
			typ = 'IDENTIFIER';
			
			this.token(typ,id,match[0].length);
			this.token(':',':');
			
			return match[0].length;
		};
		
		if (!(match = IDENTIFIER.exec(this._chunk))) {
			return 0;
		};
		
		var ary=iter$(match);var input = ary[0],id = ary[1],typ = ary[2],m3 = ary[3],m4 = ary[4],colon = ary[5];
		var idlen = id.length;
		
		// What is the logic here?
		if (id == 'own' && this.lastTokenType() == 'FOR') {
			this.token('OWN',id);
			return id.length;
		};
		
		var prev = last(this._tokens);
		var lastTyp = this._lastTyp;
		
		// should we force this to be an identifier even if it is a reserved word?
		// this should only happen for when part of object etc
		// will prev ever be @???
		var forcedIdentifier;
		
		// again
		forcedIdentifier = colon || lastTyp == '.' || lastTyp == '?.'; // in ['.', '?.'
		
		
		// temp hack! need to solve for other keywords etc as well
		// problem appears with ternary conditions.
		
		// well -- it should still be an indentifier if in object?
		// forcedIdentifier = no if id in ['undefined','break']
		
		if (colon && lastTyp == '?') { forcedIdentifier = false }; // for ternary
		
		// if we are not at the top level? -- hacky
		if (id == 'tag' && this._chunk.indexOf("tag(") == 0) { // @chunk.match(/^tokid\(/)
			forcedIdentifier = true;
		};
		
		var isKeyword = false;
		
		// console.log "match",match
		// console.log "typ is {typ}"
		// little reason to check for this right here? but I guess it is only a simple check
		if (typ == '$' && ARGVAR.test(id)) { // id.match(/^\$\d$/)
			// console.log "TYP $"
			if (id == '$0') {
				typ = 'ARGUMENTS';
			} else {
				typ = 'ARGVAR';
				id = id.substr(1);
			};
		} else if (typ == '@') {
			typ = 'IVAR';
			
			// id:reserved = yes if colon
		} else if (typ == '#') {
			// we are trying to move to generic tokens,
			// so we are starting to splitting up the symbols and the items
			// we'll see if that works
			typ = 'IDENTIFIER';
			this.token('#','#');
			id = id.substr(1);
		} else if (typ == '@@') {
			typ = 'CVAR';
		} else if (typ == '$' && !colon) {
			typ = 'GVAR';
		} else if (CONST_IDENTIFIER.test(id) || id == 'require' || id == 'global' || id == 'exports') {
			// should not hardcode this
			typ = 'CONST';
		} else if (id == 'elif') {
			this.token('ELSE','elif',id.length);
			this.token('IF','if');
			return id.length;
		} else {
			typ = 'IDENTIFIER';
		};
		
		
		
		// this catches all 
		if (!forcedIdentifier && (isKeyword = this.isKeyword(id))) {
			// (id in JS_KEYWORDS or id in IMBA_KEYWORDS)
			typ = id.toUpperCase();
			addLoc = true;
			
			// clumsy - but testing performance
			if (typ == 'YES') {
				typ = 'TRUE';
			} else if (typ == 'NO') {
				typ = 'FALSE';
			} else if (typ == 'NIL') {
				typ = 'NULL';
			} else if (typ == 'VAR') {
				if (this._lastVal == 'export') {
					tTs(prev,'EXPORT');
				};
			} else if (typ == 'IF' || typ == 'ELSE' || typ == 'TRUE' || typ == 'FALSE' || typ == 'NULL') {
				true;
			} else if (typ == 'TAG') {
				this.pushEnd('TAG');
				// @ends.push('TAG')
			} else if (typ == 'DEF') {
				// should probably shift context and optimize this
				this.openDef();
			} else if (typ == 'DO') {
				if (this.context() == 'DEF') this.closeDef();
			} else if (typ == 'WHEN' && LINE_BREAK.indexOf(this.lastTokenType()) >= 0) {
				typ = 'LEADING_WHEN';
			} else if (typ == 'FOR') {
				this._seenFor = true;
			} else if (typ == 'UNLESS') {
				typ = 'IF'; // WARN
			} else if (UNARY.indexOf(typ) >= 0) {
				typ = 'UNARY';
			} else if (RELATION.indexOf(typ) >= 0) {
				if (typ != 'INSTANCEOF' && typ != 'ISA' && this._seenFor) {
					typ = 'FOR' + typ; // ?
					this._seenFor = false;
				} else {
					typ = 'RELATION';
					if (this.value().toString() == '!') {
						this._tokens.pop(); // is fucked up??!
						// WARN we need to keep the loc, no?
						id = '!' + id;
					};
				};
			};
		};
		
		if (id == 'super') {
			typ = 'SUPER';
		};
		
		// do we really want to check this here
		if (!forcedIdentifier) {
			// should already have dealt with this
			
			if (isKeyword && IMBA_ALIASES.indexOf(id) >= 0) { id = IMBA_ALIAS_MAP[id] };
			// these really should not go here?!?
			switch (id) {
				case '!':
					typ = 'UNARY';break;
				
				case '==':
				case '!=':
				case '===':
				case '!==':
					typ = 'COMPARE';break;
				
				case '&&':
				case '||':
					typ = 'LOGIC';break;
				
				case 'break':
				case 'continue':
				case 'debugger':
				case 'arguments':
					typ = id.toUpperCase();break;
			
			};
		};
		
		// prev = last @tokens
		var len = input.length;
		
		// should be strict about the order, check this manually instead
		if (typ == 'CLASS' || typ == 'DEF' || typ == 'TAG') {
			this.queueScope(typ);
			
			var i = this._tokens.length;
			
			while (i){
				prev = this._tokens[--i];
				var ctrl = "" + tV(prev);
				// console.log("ctrl is {ctrl}")
				// need to coerce to string because of stupid CS ===
				// console.log("prev is",prev[0],prev[1])
				if (idx$(ctrl,IMBA_CONTEXTUAL_KEYWORDS) >= 0) {
					tTs(prev,ctrl.toUpperCase());
					// prev[0] = ctrl.toUpperCase # FIX
				} else {
					break;
				};
			};
		} else if (typ == 'IF') {
			this.queueScope(typ);
		} else if (typ == 'IMPORT') {
			// could manually parse the whole ting here?
			this.pushEnd('IMPORT');
			// @ends.push 'IMPORT'
		} else if (id == 'from' && ctx0 == 'IMPORT') {
			typ = 'FROM';
			this.pair('IMPORT');
		} else if (id == 'as' && ctx0 == 'IMPORT') {
			typ = 'AS';
			this.pair('IMPORT');
		};
		
		if (typ == 'IDENTIFIER') {
			// see if previous was catch -- belongs in rewriter?
			if (lastTyp == 'CATCH') {
				typ = 'CATCH_VAR';
			};
		};
		
		if (colon) {
			this.token(typ,id,idlen);
			this.moveCaret(idlen);
			this.token(':',':',colon.length);
			this.moveCaret(-idlen);
		} else {
			this.token(typ,id,idlen);
		};
		
		return len;
	};
	
	// Matches numbers, including decimals, hex, and exponential notation.
	// Be careful not to interfere with ranges-in-progress.
	Lexer.prototype.numberToken = function (){
		var binaryLiteral;
		var match,number,lexedLength;
		
		if (!(match = NUMBER.exec(this._chunk))) { return 0 };
		
		number = match[0];
		lexedLength = number.length;
		
		if (binaryLiteral = /0b([01]+)/.exec(number)) {
			
			number = "" + parseInt(binaryLiteral[1],2);
		};
		
		var prev = last(this._tokens);
		
		if (match[0][0] == '.' && prev && !(prev.spaced) && ['IDENTIFIER',')','}',']','NUMBER'].indexOf(tT(prev)) >= 0) {
			console.log("got here");
			this.token(".",".");
			number = number.substr(1);
		};
		
		
		this.token('NUMBER',number,lexedLength);
		return lexedLength;
	};
	
	Lexer.prototype.symbolToken = function (){
		var match,symbol,prev;
		
		if (!(match = SYMBOL.exec(this._chunk))) { return 0 };
		symbol = match[0].substr(1);
		prev = last(this._tokens);
		
		// is this a property-access?
		// should invert this -- only allow when prev IS .. 
		
		// : should be a token itself, with a specification of spacing (LR,R,L,NONE)
		
		// FIX
		if (prev && !(prev.spaced) && idx$(tT(prev),['(','{','[','.','CALL_START','INDEX_START',',','=','INDENT','TERMINATOR']) == -1) {
			this.token('.','.');
			symbol = symbol.split(/[\:\\\/]/)[0]; // really?
			// token 'SYMBOL', "'#{symbol}'"
			this.token('SYMBOL',symbol);
			return symbol.length + 1;
		} else {
			// token 'SYMBOL', "'#{symbol}'"
			this.token('SYMBOL',symbol);
			return match[0].length;
		};
	};
	
	// Matches strings, including multi-line strings. Ensures that quotation marks
	// are balanced within the string's contents, and within nested interpolations.
	Lexer.prototype.stringToken = function (){
		var match,string;
		
		switch (this._chunk.charAt(0)) {
			case "'":
				if (!(match = SIMPLESTR.exec(this._chunk))) { return 0 };
				this.token('STRING',(string = match[0]).replace(MULTILINER,'\\\n'),string.length);
				break;
			
			case '"':
				if (!(string = this.balancedString(this._chunk,'"'))) { return 0 };
				
				if (string.indexOf('{') >= 0) {
					this.interpolateString(string.slice(1,-1));
				} else {
					this.token('STRING',this.escapeLines(string),string.length);
				};
				break;
			
			default:
			
				return 0;
		
		};
		
		this.moveHead(string);
		// var br = count(string, '\n')
		// @line += br
		
		return string.length;
	};
	
	// Matches heredocs, adjusting indentation to the correct level, as heredocs
	// preserve whitespace, but ignore indentation to the left.
	Lexer.prototype.heredocToken = function (){
		var match,heredoc,quote,doc;
		
		if (!(match = HEREDOC.exec(this._chunk))) { return 0 };
		
		heredoc = match[0];
		quote = heredoc.charAt(0);
		doc = this.sanitizeHeredoc(match[2],{quote: quote,indent: null});
		// console.log "found heredoc {match[0]:length} {doc:length}"
		
		if (quote == '"' && doc.indexOf('{') >= 0) {
			this.interpolateString(doc,{heredoc: true});
		} else {
			this.token('STRING',this.makeString(doc,quote,true),0);
		};
		
		this.moveHead(heredoc);
		// var br = count heredoc, '\n'
		// @line += br
		
		return heredoc.length;
	};
	
	// Matches and consumes comments.
	Lexer.prototype.commentToken = function (){
		var match,length,comment,indent,prev;
		
		var typ = 'HERECOMMENT';
		
		if (match = INLINE_COMMENT.exec(this._chunk)) { // .match(INLINE_COMMENT)
			// console.log "match inline comment"
			length = match[0].length;
			indent = match[1];
			comment = match[2];
			
			prev = last(this._tokens);
			var pt = prev && tT(prev);
			var note = '//' + comment.substr(1);
			
			if (this._last && this._last.spaced) {
				note = ' ' + note;
				// console.log "the previous node was SPACED"
			};
			// console.log "comment {note} - indent({indent}) - {length} {comment:length}"
			
			if ((pt && pt != 'INDENT' && pt != 'TERMINATOR') || !pt) {
				// console.log "skip comment"
				// token 'INLINECOMMENT', comment.substr(2)
				// console.log "adding as terminator"
				this.token('TERMINATOR',note,length); // + '\n'
			} else {
				// console.log "add comment ({note})"
				if (pt == 'TERMINATOR') {
					tVs(prev,tV(prev) + note);
					// prev[1] += note
				} else if (pt == 'INDENT') {
					// console.log "adding comment to INDENT: {note}" # why not add directly here?
					this.addLinebreaks(1,note);
				} else {
					// console.log "comment here"
					// should we ever get here?
					this.token(typ,comment.substr(2),length); // are we sure?
				};
			};
			
			return length; // disable now while compiling
		};
		
		// should use exec?
		if (!(match = COMMENT.exec(this._chunk))) { return 0 };
		
		comment = match[0];
		var here = match[1];
		
		if (here) {
			this.token('HERECOMMENT',this.sanitizeHeredoc(here,{herecomment: true,indent: Array(this._indent + 1).join(' ')}),comment.length);
			this.token('TERMINATOR','\n');
		} else {
			this.token('HERECOMMENT',comment,comment.length);
			this.token('TERMINATOR','\n'); // auto? really?
		};
		
		this.moveHead(comment);
		// var br = count(comment,'\n')
		// @line += br
		
		return comment.length;
	};
	
	// Matches JavaScript interpolated directly into the source via backticks.
	Lexer.prototype.jsToken = function (){
		var match,script;
		
		if (!(this._chunk.charAt(0) == '`' && (match = JSTOKEN.exec(this._chunk)))) { return 0 };
		this.token('JS',(script = match[0]).slice(1,-1));
		return script.length;
	};
	
	// Matches regular expression literals. Lexing regular expressions is difficult
	// to distinguish from division, so we borrow some basic heuristics from
	// JavaScript and Ruby.
	Lexer.prototype.regexToken = function (){
		var ary;
		var match,length,prev;
		
		if (this._chunk.charAt(0) != '/') { return 0 };
		if (match = HEREGEX.exec(this._chunk)) {
			length = this.heregexToken(match);
			this.moveHead(match[0]);
			// var br = count(match[0], '\n')
			// @line += br
			return length;
		};
		
		prev = last(this._tokens);
		// FIX
		if (prev && (idx$(tT(prev),(prev.spaced ? (
			NOT_REGEX
		) : (
			NOT_SPACED_REGEX
		))) >= 0)) { return 0 };
		if (!(match = REGEX.exec(this._chunk))) { return 0 };
		var ary=iter$(match);var m = ary[0],regex = ary[1],flags = ary[2];
		
		// FIXME
		// if regex[..1] is '/*'
		//	error 'regular expressions cannot begin with `*`'
		
		if (regex == '//') {
			regex = '/(?:)/';
		};
		
		this.token('REGEX',("" + regex + flags),m.length);
		return m.length;
	};
	
	// Matches multiline extended regular expressions.
	Lexer.prototype.heregexToken = function (match){
		var ary;
		var ary=iter$(match);var heregex = ary[0],body = ary[1],flags = ary[2];
		
		if (0 > body.indexOf('#{')) {
			
			var re = body.replace(HEREGEX_OMIT,'').replace(/\//g,'\\/');
			
			if (re.match(/^\*/)) {
				this.error('regular expressions cannot begin with `*`');
			};
			
			this.token('REGEX',("/" + (re || '(?:)') + "/" + flags),heregex.length);
			return heregex.length;
		};
		
		this.token('CONST','RegExp');
		this._tokens.push(T.token('CALL_START','(',0));
		var tokens = [];
		
		for (var i=0, items=iter$(this.interpolateString(body,{regex: true})), len=items.length, pair; i < len; i++) {
			
			pair = items[i];var tok = tT(pair); // FIX
			var value = tV(pair); // FIX
			
			if (tok == 'TOKENS') {
				// FIXME what is this?
				tokens.push.apply(tokens,value);
			} else {
				if (!value) {
					console.log("what??");
				};
				
				if (!(value = value.replace(HEREGEX_OMIT,''))) { continue };
				
				value = value.replace(/\\/g,'\\\\');
				tokens.push(T.token('STRING',this.makeString(value,'"',true),0)); // FIX
			};
			
			tokens.push(T.token('+','+',0)); // FIX
		};
		
		tokens.pop();
		
		// FIX
		if (!(tokens[0] && tT(tokens[0]) == 'STRING')) {
			// FIX
			this._tokens.push(T.token('STRING','""'),T.token('+','+'));
		};
		
		this._tokens.push.apply(this._tokens,tokens); // what is this?
		// FIX
		
		if (flags) {
			this._tokens.push(T.token(',',',',0));
			this._tokens.push(T.token('STRING','"' + flags + '"',0));
		};
		
		this.token(')',')',0);
		
		return heregex.length;
	};
	
	// Matches newlines, indents, and outdents, and determines which is which.
	// If we can detect that the current line is continued onto the the next line,
	// then the newline is suppressed:
	//
	//     elements
	//       .each( ... )
	//       .map( ... )
	//
	// Keeps track of the level of indentation, because a single outdent token
	// can close multiple indents, so we need to know how far in we happen to be.
	Lexer.prototype.lineToken = function (){
		var match;
		
		if (!(match = MULTI_DENT.exec(this._chunk))) { return 0 };
		// should it not pair by itself token('SELECTOR_END','%',0)
		// if @end == '%'
		// 	console.log "pairing selector in lineToken {@chunk.substr(0,10)}"
		// 	# should not need to add anything here?
		// 	pair('%')
		
		var indent = match[0];
		// var brCount = count indent, '\n'
		var brCount = this.moveHead(indent);
		// @line += brCount
		this._seenFor = false;
		// reset column as well?
		
		var prev = last(this._tokens,1);
		var size = indent.length - 1 - indent.lastIndexOf('\n');
		var noNewlines = this.unfinished();
		
		// console.log "noNewlines",noNewlines
		// console.log "lineToken -- ",@chunk.substr(0,10),"--"
		if ((/^\n#\s/).test(this._chunk)) {
			this.addLinebreaks(1);
			return 0;
		};
		
		if (size - this._indebt == this._indent) {
			if (noNewlines) {
				this.suppressNewlines();
			} else {
				this.newlineToken(brCount);
			};
			return indent.length;
		};
		
		if (size > this._indent) {
			if (noNewlines) {
				this._indebt = size - this._indent;
				this.suppressNewlines();
				return indent.length;
			};
			
			if (this.inTag()) {
				// console.log "indent inside tokid?!?"
				// @indebt = size - @indent
				// suppressNewlines()
				return indent.length;
			};
			
			
			var diff = size - this._indent + this._outdebt;
			this.closeDef();
			
			var immediate = last(this._tokens);
			
			if (immediate && tT(immediate) == 'TERMINATOR') {
				tTs(immediate,'INDENT');
				immediate._meta || (immediate._meta = {pre: tV(immediate),post: ''});
				
				// should rather add to meta somehow?!?
				// tVs(immediate,tV(immediate) + '%|%') # crazy
			} else {
				this.token('INDENT',"" + diff,0);
			};
			
			// console.log "indenting", prev, last(@tokens,1)
			// if prev and prev[0] == 'TERMINATOR'
			//   console.log "terminator before indent??"
			
			// check for comments as well ?
			
			this._indents.push(diff);
			this.pushEnd('OUTDENT');
			// @ends.push 'OUTDENT'
			this._outdebt = this._indebt = 0;
			this.addLinebreaks(brCount);
		} else {
			this._indebt = 0;
			this.outdentToken(this._indent - size,noNewlines,brCount);
			this.addLinebreaks(brCount - 1);
			// console.log "outdent",noNewlines,tokid()
		};
		
		this._indent = size;
		return indent.length;
	};
	
	// Record an outdent token or multiple tokens, if we happen to be moving back
	// inwards past several recorded indents.
	Lexer.prototype.outdentToken = function (moveOut,noNewlines,newlineCount){
		// here we should also take care to pop / reset the scope-body
		// or context-type for indentation 
		var dent = 0;
		while (moveOut > 0){
			var len = this._indents.length - 1;
			if (this._indents[len] == undefined) {
				moveOut = 0;
			} else if (this._indents[len] == this._outdebt) {
				moveOut -= this._outdebt;
				this._outdebt = 0;
			} else if (this._indents[len] < this._outdebt) {
				this._outdebt -= this._indents[len];
				moveOut -= this._indents[len];
			} else {
				dent = this._indents.pop() - this._outdebt;
				moveOut -= dent;
				this._outdebt = 0;
				
				if (!noNewlines) { this.addLinebreaks(1) };
				
				this.pair('OUTDENT');
				this.token('OUTDENT',"" + dent,0);
			};
		};
		
		if (dent) { this._outdebt -= moveOut };
		
		while (this.lastTokenValue() == ';'){
			this._tokens.pop();
		};
		
		if (!(this.lastTokenType() == 'TERMINATOR' || noNewlines)) { this.token('TERMINATOR','\n',0) };
		
		// capping scopes so they dont hang around 
		this._scopes.length = this._indents.length;
		
		var ctx = this.context();
		if (ctx == '%' || ctx == 'TAG') { this.pair(ctx) }; // really?
		this.closeDef();
		return this;
	};
	
	// Matches and consumes non-meaningful whitespace. tokid the previous token
	// as being "spaced", because there are some cases where it makes a difference.
	Lexer.prototype.whitespaceToken = function (){
		var match,nline,prev;
		if (!((match = WHITESPACE.exec(this._chunk)) || (nline = this._chunk.charAt(0) == '\n'))) { return 0 };
		prev = last(this._tokens);
		
		// FIX - why oh why?
		if (prev) {
			if (match) {
				prev.spaced = true;
				return match[0].length;
			} else {
				prev.newLine = true;
				return 0;
			};
		};
	};
	
	Lexer.prototype.addNewline = function (){
		return this.token('TERMINATOR','\n');
	};
	
	Lexer.prototype.moveHead = function (str){
		var br = count(str,'\n');
		this._line += br;
		
		
		if (br > 0) {
			var idx = str.length;
			var col = 0;
			while (idx > 0 && str[--idx] != '\n'){
				col++;
			};
			this._col = this._colOffset = col;
		};
		
		return br;
	};
	
	
	Lexer.prototype.addLinebreaks = function (count,raw){
		var br;
		
		if (!raw && count == 0) { return this }; // no terminators?
		
		var prev = this._last;
		
		if (!raw) {
			if (count == 1) {
				br = '\n';
			} else if (count == 2) {
				br = '\n\n';
			} else if (count == 3) {
				br = '\n\n\n';
			} else {
				br = repeatString('\n',count);
			};
		};
		// FIX
		if (prev) {
			var t = prev._type; // @lastTyp
			var v = tV(prev);
			
			// we really want to add this
			if (t == 'INDENT') {
				// TODO we want to add to the indent
				// console.log "add the comment to the indent -- pre? {raw} {br}"
				
				var meta = prev._meta || (prev._meta = {pre: '',post: ''});
				meta.post += (raw || br);
				// tVs(v + (raw or br))
				return this;
			} else if (t == 'TERMINATOR') {
				// console.log "already exists terminator {br} {raw}"
				tVs(prev,v + (raw || br));
				return this;
			};
		};
		
		this.token('TERMINATOR',br,0);
		return;
	};
	
	// Generate a newline token. Consecutive newlines get merged together.
	Lexer.prototype.newlineToken = function (lines){
		// console.log "newlineToken"
		while (this.lastTokenValue() == ';'){
			console.log("pop token",this._tokens[this._tokens.length - 1]);
			this._tokens.pop();
		};
		
		this.addLinebreaks(lines);
		
		var ctx = this.context();
		// WARN now import cannot go over multiple lines
		if (ctx == 'TAG' || ctx == 'IMPORT') { this.pair(ctx) };
		this.closeDef(); // close def -- really?
		return this;
	};
	
	// Use a `\` at a line-ending to suppress the newline.
	// The slash is removed here once its job is done.
	Lexer.prototype.suppressNewlines = function (){
		if (this.value() == '\\') { this._tokens.pop() };
		return this;
	};
	
	// We treat all other single characters as a token. E.g.: `( ) , . !`
	// Multi-character operators are also literal tokens, so that Jison can assign
	// the proper order of operations. There are some symbols that we tokid specially
	// here. `;` and newlines are both treated as a `TERMINATOR`, we distinguish
	// parentheses that indicate a method call from regular parentheses, and so on.
	Lexer.prototype.literalToken = function (){
		var match,value;
		if (match = OPERATOR.exec(this._chunk)) {
			value = match[0];
			if (CODE.test(value)) this.tagParameters();
		} else {
			value = this._chunk.charAt(0);
		};
		
		var end1 = this._ends[this._ends.length - 1];
		var end2 = this._ends[this._ends.length - 2];
		
		var inTag = end1 == 'TAG_END' || end1 == 'OUTDENT' && end2 == 'TAG_END';
		
		var tokid = value;
		var prev = last(this._tokens);
		var pt = prev && tT(prev);
		var pv = prev && tV(prev);
		var length = value.length;
		
		// is this needed?
		if (value == '=' && prev) {
			
			if (pv == '||' || pv == '&&') { // in ['||', '&&']
				tTs(prev,'COMPOUND_ASSIGN');
				tVs(prev,pv + '=');
				// prev[0] = 'COMPOUND_ASSIGN'
				// prev[1] += '='
				return value.length;
			};
		};
		
		if (value == ';') {
			this._seenFor = false;
			tokid = 'TERMINATOR';
		} else if (value == '(' && inTag && pt != '=' && prev.spaced) { // FIXed
			// console.log 'spaced before ( in tokid'
			// FIXME - should rather add a special token like TAG_PARAMS_START
			this.token(',',',');
		} else if (value == '->' && inTag) {
			tokid = 'TAG_END';
			this.pair('TAG_END');
		} else if (value == '/>' && inTag) {
			tokid = 'TAG_END';
			this.pair('TAG_END');
		} else if (value == '>' && inTag) {
			tokid = 'TAG_END';
			this.pair('TAG_END');
		} else if (value == '>' && this.context() == 'DEF') {
			// console.log('picked up >!!')
			tokid = 'DEF_FRAGMENT';
			
			// elif value is 'TERMINATOR' and end1 is '%' 
			// 	closeSelector()
		} else if (value == 'TERMINATOR' && end1 == 'DEF') {
			this.closeDef();
		} else if (value == '&' && this.context() == 'DEF') {
			// console.log("okay!")
			tokid = 'BLOCK_ARG';
			// change the next identifier instead?
		} else if (value == '*' && this._chunk.charAt(1).match(/[A-Za-z\_\@\[]/) && (prev.spaced || [',','(','[','{','|','\n','\t'].indexOf(pv) >= 0)) {
			tokid = "SPLAT";
		} else if (value == '√') {
			tokid = 'SQRT';
		} else if (value == 'ƒ') {
			tokid = 'FUNC';
		} else if (idx$(value,MATH) >= 0) {
			tokid = 'MATH';
		} else if (idx$(value,COMPARE) >= 0) {
			tokid = 'COMPARE';
		} else if (idx$(value,COMPOUND_ASSIGN) >= 0) {
			tokid = 'COMPOUND_ASSIGN';
		} else if (idx$(value,UNARY) >= 0) {
			tokid = 'UNARY';
		} else if (idx$(value,SHIFT) >= 0) {
			tokid = 'SHIFT';
		} else if (idx$(value,LOGIC) >= 0) {
			tokid = 'LOGIC'; // or value is '?' and prev?:spaced 
		} else if (prev && !(prev.spaced)) {
			// need a better way to do these
			if (value == '(' && end1 == '%') {
				tokid = 'TAG_ATTRS_START';
			} else if (value == '(' && idx$(pt,CALLABLE) >= 0) {
				// not using this ???
				// prev[0] = 'FUNC_EXIST' if prev[0] is '?'
				tokid = 'CALL_START';
			} else if (value == '[' && idx$(pt,INDEXABLE) >= 0) {
				tokid = 'INDEX_START';
				if (pt == '?') { tTs(prev,'INDEX_SOAK') };
				// prev[0] = 'INDEX_SOAK' if prev[0] == '?'
			};
		};
		
		switch (value) {
			case '(':
			case '{':
			case '[':
				this.pushEnd(INVERSES[value]);break;
			
			case ')':
			case '}':
			case ']':
				this.pair(value);break;
		
		};
		
		// hacky rule to try to allow for tuple-assignments in blocks
		// if value is ',' and prev[0] is 'IDENTIFIER' and @tokens[@tokens:length - 2][0] in ['TERMINATOR','INDENT']
		//   # token "TUPLE", "tuple" # should rather insert it somewhere else, no?
		//   console.log("found comma")
		
		this.token(tokid,value,value.length);
		return value.length;
	};
	
	// Token Manipulators
	// ------------------
	
	// Sanitize a heredoc or herecomment by
	// erasing all external indentation on the left-hand side.
	Lexer.prototype.sanitizeHeredoc = function (doc,options){
		var match;
		var indent = options.indent;
		var herecomment = options.herecomment;
		
		if (herecomment) {
			if (HEREDOC_ILLEGAL.test(doc)) {
				this.error("block comment cannot contain '*/' starting");
			};
			if (doc.indexOf('\n') <= 0) { return doc };
		} else {
			while (match = HEREDOC_INDENT.exec(doc)){
				var attempt = match[1];
				if (indent == null || 0 < (length_=attempt.length) && length_ < indent.length) {
					indent = attempt;
				};
			};
		};
		
		if (indent) { doc = doc.replace(RegExp("\\n" + indent,"g"),'\n') };
		if (!herecomment) { doc = doc.replace(/^\n/,'') };
		return doc;
	};
	
	// A source of ambiguity in our grammar used to be parameter lists in function
	// definitions versus argument lists in function calls. Walk backwards, tokidging
	// parameters specially in order to make things easier for the parser.
	Lexer.prototype.tagParameters = function (){
		var tok;
		if (this.lastTokenType() != ')') { return this };
		var stack = [];
		var tokens = this._tokens;
		var i = tokens.length;
		
		tTs(tokens[--i],'PARAM_END');
		
		while (tok = tokens[--i]){
			var t = tT(tok);
			switch (t) {
				case ')':
					stack.push(tok);
					break;
				
				case '(':
				case 'CALL_START':
					if (stack.length) {
						stack.pop();
					} else if (t == '(') {
						tTs(tok,'PARAM_START');
						return this;
					} else {
						return this;
					};
					break;
			
			};
		};
		
		return this;
	};
	
	// Close up all remaining open blocks at the end of the file.
	Lexer.prototype.closeIndentation = function (){
		// ctx = context
		// pair(ctx) if ctx in ['%','DEF']
		this.closeDef();
		this.closeSelector();
		return this.outdentToken(this._indent,false,0);
	};
	
	// Matches a balanced group such as a single or double-quoted string. Pass in
	// a series of delimiters, all of which must be nested correctly within the
	// contents of the string. This method allows us to have strings within
	// interpolations within strings, ad infinitum.
	Lexer.prototype.balancedString = function (str,end){
		var match,letter,prev;
		
		// console.log 'balancing string!', str, end
		var stack = [end];
		var i = 0;
		
		
		// had to fix issue after later versions of coffee-script broke old loop type
		// should submit bugreport to coffee-script
		
		// could it not happen here?
		while (i < (str.length - 1)){
			i++;
			letter = str.charAt(i);
			switch (letter) {
				case '\\':
					i++;
					continue;
					break;
				
				case end:
					stack.pop();
					if (!(stack.length)) {
						var v = str.slice(0,i + 1);
						return v;
					};
					end = stack[stack.length - 1];
					continue;
					break;
			
			};
			
			if (end == '}' && (letter == '"' || letter == "'")) {
				stack.push(end = letter);
			} else if (end == '}' && letter == '/' && (match = (HEREGEX.exec(str.slice(i)) || REGEX.exec(str.slice(i))))) {
				i += match[0].length - 1;
			} else if (end == '}' && letter == '{') {
				stack.push(end = '}');
			} else if (end == '"' && letter == '{') {
				stack.push(end = '}');
			};
			prev = letter;
		};
		
		return this.error(("missing " + (stack.pop()) + ", starting"));
	};
	
	// Expand variables and expressions inside double-quoted strings using
	// Ruby-like notation for substitution of arbitrary expressions.
	//
	//     "Hello #{name.capitalize()}."
	//
	// If it encounters an interpolation, this method will recursively create a
	// new Lexer, tokenize the interpolated contents, and merge them into the
	// token stream.
	Lexer.prototype.interpolateString = function (str,options){
		// console.log "interpolate string"
		var len, interpolated;
		if(options === undefined) options = {};
		var heredoc = options.heredoc;
		var regex = options.regex;
		var prefix = options.prefix;
		
		var startLoc = this._loc;
		var tokens = [];
		var pi = 0;
		var i = -1;
		var strlen = str.length;
		var letter;
		var expr;
		// out of bounds
		while (letter = str.charAt(i += 1)){
			if (letter == '\\') {
				i += 1;
				continue;
			};
			
			if (!(str.charAt(i) == '{' && (expr = this.balancedString(str.slice(i),'}')))) {
				continue;
			};
			
			// these have no real sense of location or anything?
			// what is this conditino really?
			if (pi < i) {
				// this is the prefix-string - before any item
				var tok = T.token('NEOSTRING',str.slice(pi,i));
				tok._loc = this._loc + pi;
				tok._len = i - pi + 2;
				tokens.push(tok);
			};
			
			var inner = expr.slice(1,-1);
			// console.log 'inner is',inner
			// remove leading spaces 
			inner = inner.replace(/^[^\n\S]+/,'');
			
			if (inner.length) {
				// we need to remember the loc we start at
				// console.log('interpolate from loc',@loc,i)
				// really? why not just add to the stack??
				// what about the added 
				// should share with the selector no?
				// console.log "tokenize inner parts of string",inner
				var spaces = 0;
				var offset = this._loc + i + (expr.length - inner.length);
				var nested = new Lexer().tokenize(inner,{inline: true,line: this._line,rewrite: false,loc: offset});
				// console.log nested.pop
				
				if (nested[0] && tT(nested[0]) == 'TERMINATOR') {
					nested.shift();
				};
				
				// drop the automatic terminator at the end as well?
				// console.log "last token from lexer ",nested[nested:length - 1]
				
				if (len = nested.length) {
					if (len > 1) {
						// what about here?!?
						nested.unshift(new Token('(','(',this._line,0,0));
						nested.push(new Token(')',')',this._line,0,0)); // very last line?
					};
					tokens.push(T.token('TOKENS',nested,0));
					// tokens.push nested
				};
			};
			
			// should rather add the amount by which our lexer has moved?
			i += expr.length - 1;
			pi = i + 1;
		};
		
		// adding the last part of the string here
		if (i > pi && pi < str.length) {
			// set the length as well - or?
			// the string after?
			
			tokens.push(T.token('NEOSTRING',str.slice(pi),0));
		};
		
		if (regex) { return tokens };
		
		if (!(tokens.length)) { return this.token('STRING','""') };
		
		if (tT(tokens[0]) != 'NEOSTRING') {
			// adding a blank string to the very beginning
			// 
			tokens.unshift(T.token('','',0));
		};
		
		if (interpolated = tokens.length > 1) {
			this.token('(','("',0);
		};
		
		for (var k=0, len_=tokens.length, v; k < len_; k++) {
			v = tokens[k];if (k) { this.token('+','+',0) };
			
			// if v isa Array
			// 	@tokens.push(iv) for iv in v
			// 	continue
			
			var typ = tT(v);
			var value = tV(v);
			
			if (typ == 'TOKENS') {
				// console.log 'got here'
				
				for (var j=0, ary=iter$(value), len__=ary.length, inner1; j < len__; j++) {
					// console.log "token {inner.@type} {inner.@loc}"
					inner1 = ary[j];this._tokens.push(inner1);
					this._loc = inner1._loc + inner1._len;
				};
				// @tokens.push *value
			} else {
				if (typ == 'NEOSTRING') {
					// console.log "WAS NEOSTRING {value} - {value:length}"
					this._loc = v._loc;
					// just change the string?
				};
				
				this.token('STRING',this.makeString(value,'"',heredoc)); // , v.@len # , value:length
				this._loc += v._len;
			};
		};
		
		if (interpolated) {
			this._loc += 2; // really?
			this._loc = startLoc + str.length + 2;
			this.token(')','")',0);
		};
		return tokens;
	};
	
	// Matches a balanced group such as a single or double-quoted string. Pass in
	// a series of delimiters, all of which must be nested correctly within the
	// contents of the string. This method allows us to have strings within
	// interpolations within strings, ad infinitum.
	Lexer.prototype.balancedSelector = function (str,end){
		var prev;
		var letter;
		var stack = [end];
		// FIXME
		for (var len=str.length, i = 1; i < len; i++) {
			switch (letter = str.charAt(i)) {
				case '\\':
					i++;
					continue;
					break;
				
				case end:
					stack.pop();
					if (!(stack.length)) {
						return str.slice(0,i + 1);
					};
					
					end = stack[stack.length - 1];
					continue;
					break;
			
			};
			if (end == '}' && letter == [')']) {
				stack.push(end = letter);
			} else if (end == '}' && letter == '{') {
				stack.push(end = '}');
			} else if (end == ')' && letter == '{') {
				stack.push(end = '}');
			};
			prev = letter; // what, why?
		};
		
		return this.error(("missing " + (stack.pop()) + ", starting"));
	};
	
	// Pairs up a closing token, ensuring that all listed pairs of tokens are
	// correctly balanced throughout the course of the token stream.
	Lexer.prototype.pair = function (tok){
		var wanted = last(this._ends);
		if (tok != wanted) {
			if ('OUTDENT' != wanted) { this.error(("unmatched " + tok)) };
			var size = last(this._indents);
			this._indent -= size;
			this.outdentToken(size,true,0);
			return this.pair(tok);
		};
		// FIXME move into endSelector
		if (false && tok == '%') { // move outside?
			// have not added to the loc just yet
			this.token('SELECTOR_END','%',0);
		};
		// @ends["_" + (@ends:length - 1)] = undefined
		return this.popEnd();
		// @contexts.pop
		// @ends.pop
	};
	
	
	// Helpers
	// -------
	
	// Add a token to the results, taking note of the line number.
	Lexer.prototype.token = function (id,value,len){ // , addLoc
		this._lastTyp = id;
		this._lastVal = value;
		
		var tok = this._last = new Token(id,value,this._line,this._loc,len || 0);
		tok._col = this._col;
		this._tokens.push(tok); // @last
		return;
	};
	
	Lexer.prototype.lastTokenType = function (){
		var token = this._tokens[this._tokens.length - 1];
		return token ? (tT(token)) : ('NONE');
	};
	
	Lexer.prototype.lastTokenValue = function (){
		var token = this._tokens[this._tokens.length - 1];
		return token ? (token._value) : ('');
	};
	
	// Peek at a tokid in the current token stream.
	Lexer.prototype.tokid = function (index,val){
		var tok;
		if (tok = last(this._tokens,index)) {
			if (val) { tTs(tok,val) };
			return tT(tok);
			// tok.@type = tokid if tokid # why?
			// tok.@type
		} else {
			return null;
		};
	};
	
	// Peek at a value in the current token stream.
	Lexer.prototype.value = function (index,val){
		var tok;
		if (tok = last(this._tokens,index)) {
			if (val) { tVs(tok,val) };
			return tV(tok);
			// tok.@value = val if val # why?
			// tok.@value
		} else {
			return null;
		};
	};
	
	
	// Are we in the midst of an unfinished expression?
	Lexer.prototype.unfinished = function (){
		if (LINE_CONTINUER.test(this._chunk)) { return true };
		return UNFINISHED.indexOf(this._lastTyp) >= 0;
	};
	
	// var tokens = ['\\','.', '?.', 'UNARY', 'MATH', '+', '-', 'SHIFT', 'RELATION', 'COMPARE', 'LOGIC', 'COMPOUND_ASSIGN', 'THROW', 'EXTENDS']
	
	// Converts newlines for string literals.
	Lexer.prototype.escapeLines = function (str,heredoc){
		return str.replace(MULTILINER,(heredoc ? ('\\n') : ('')));
	};
	
	// Constructs a string token by escaping quotes and newlines.
	Lexer.prototype.makeString = function (body,quote,heredoc){
		if (!body) { return quote + quote };
		body = body.replace(/\\([\s\S])/g,function(match,contents) {
			return (contents == '\n' || contents == quote) ? (contents) : (match);
		});
		
		body = body.replace(RegExp("" + quote,"g"),'\\$&');
		return quote + this.escapeLines(body,heredoc) + quote;
	};
	
	// Throws a syntax error on the current `@line`.
	Lexer.prototype.error = function (message,len){
		var msg = ("" + message + " on line " + this._line);
		
		if (len) {
			msg += (" [" + this._loc + ":" + (this._loc + len) + "]");
		};
		
		var err = new SyntaxError(msg);
		err.line = this._line;
		// err:columnNumber
		err = new ERR.ImbaParseError(err,{tokens: this._tokens,pos: this._tokens.length});
		throw err;
	};
	


}())
},{"./errors":3,"./rewriter":9,"./token":10}],7:[function(require,module,exports){
(function(){


	function idx$(a,b){
		return (b && b.indexOf) ? b.indexOf(a) : [].indexOf.call(a,b);
	};
	
	// helper for subclassing
	function subclass$(obj,sup) {
		for (var k in sup) {
			if (sup.hasOwnProperty(k)) obj[k] = sup[k];
		};
		// obj.__super__ = sup;
		obj.prototype = Object.create(sup.prototype);
		obj.__super__ = obj.prototype.__super__ = sup.prototype;
		obj.prototype.initialize = obj.prototype.constructor = obj;
	};
	
	function iter$(a){ return a ? (a.toArray ? a.toArray() : a) : []; };
	var AST, OP, OP_COMPOUND, NODES, SPLAT, STACK, K_IVAR, K_SYM, K_STR, K_PROP, BR, BR2, SELF, SUPER, TRUE, FALSE, UNDEFINED, NIL, ARGUMENTS, EMPTY, NULL, RESERVED, RESERVED_REGEX, UNION, INTERSECT, CLASSDEF, TAGDEF, NEWTAG;
	// TODO Create Expression - make all expressions inherit from these?
	
	// externs;
	
	var helpers = require('./helpers');
	var v8 = null; // require 'v8-natives'
	
	var T = require('./token');
	var Token = T.Token;
	
	
	module.exports.AST = AST = {};
	
	// Helpers for operators
	module.exports.OP = OP = function(op,l,r) {
		var o = String(op);
		// console.log "operator",o
		switch (o) {
			case '.':
				if ((typeof r=='string'||r instanceof String)) { r = new Identifier(r) };
				// r = r.value if r isa VarOrAccess
				return new Access(op,l,r);
				break;
			
			case '=':
				if (l instanceof Tuple) { return new TupleAssign(op,l,r) };
				return new Assign(op,l,r);
				break;
			
			case '?=':
			case '||=':
			case '&&=':
				return new ConditionalAssign(op,l,r);
				break;
			
			case '+=':
			case '-=':
			case '*=':
			case '/=':
			case '^=':
			case '%=':
				return new CompoundAssign(op,l,r);
				break;
			
			case '?.':
				if (r instanceof VarOrAccess) {
					// console.log "is var or access"
					r = r.value();
				};
				// depends on the right side - this is wrong
				return new PropertyAccess(op,l,r);
				break;
			
			case 'instanceof':
				return new InstanceOf(op,l,r);
				break;
			
			case 'in':
				return new In(op,l,r);
				break;
			
			case 'typeof':
				return new TypeOf(op,l,r);
				break;
			
			case 'delete':
				return new Delete(op,l,r);
				break;
			
			case '--':
			case '++':
			case '!':
			case '√':
				return new UnaryOp(op,l,r);
				break;
			
			case '>':
			case '<':
			case '>=':
			case '<=':
			case '==':
			case '===':
			case '!=':
			case '!==':
				return new ComparisonOp(op,l,r);
				break;
			
			case '∩':
			case '∪':
				return new MathOp(op,l,r);
				break;
			
			case '..':
			case '...':
				return new Range(op,l,r);
				break;
			
			default:
			
				return new Op(op,l,r);
		
		};
	};
	
	module.exports.OP_COMPOUND = OP_COMPOUND = function(sym,op,l,r) {
		// console.log "?. soak operator",sym
		if (sym == '?.') {
			console.log("?. soak operator");
			return null;
		};
		if (sym == '?=' || sym == '||=' || sym == '&&=') {
			return new ConditionalAssign(op,l,r);
		} else {
			return new CompoundAssign(op,l,r);
		};
	};
	
	var OPTS = {};
	
	module.exports.NODES = NODES = [];
	
	var LIT = function(val) {
		return new Literal(val);
	};
	
	var SYM = function(val) {
		return new Symbol(val);
	};
	
	var IF = function(cond,body,alt) {
		var node = new If(cond,body);
		if (alt) { node.addElse(alt) };
		return node;
	};
	
	var FN = function(pars,body) {
		return new Func(pars,body);
	};
	
	var CALL = function(callee,pars) {
		// possibly return instead(!)
		if(pars === undefined) pars = [];
		return new Call(callee,pars);
	};
	
	var CALLSELF = function(name,pars) {
		if(pars === undefined) pars = [];
		var ref = new Identifier(name);
		return new Call(OP('.',SELF,ref),pars);
	};
	
	var BLOCK = function() {
		return Block.wrap([].slice.call(arguments));
	};
	
	var WHILE = function(test,code) {
		return new While(test).addBody(code);
	};
	
	module.exports.SPLAT = SPLAT = function(value) {
		if (value instanceof Assign) {
			// p "WARN"
			value.setLeft(new Splat(value.left()));
			return value;
		} else {
			return new Splat(value);
			// not sure about this
		};
	};
	
	// OP.ASSIGNMENT = [ "=" , "+=" , "-=" , "*=" , "/=" , "%=", "<<=" , ">>=" , ">>>=", "|=" , "^=" , "&=" ]
	// OP.LOGICAL = [ "||" , "&&" ]
	// OP.UNARY = [ "++" , "--" ]
	
	var SEMICOLON_TEST = /;(\s*\/\/.*)?[\n\s\t]*$/;
	
	
	function parseError(str,o){
		// console.log "parseError {str}"
		if (o.lexer) {
			var token = o.lexer.yytext;
			// console.log token.@col
			str = ("[" + (token._loc) + ":" + (token._len || String(token).length) + "] " + str);
		};
		var e = new Error(str);
		e.lexer = o.lexer;
		throw e;
	}; exports.parseError = parseError;
	
	function c__(obj){
		return typeof obj == 'string' ? (obj) : (obj.c());
	};
	
	function num__(num){
		return new Num(num);
	};
	
	function str__(str){
		// should pack in token?!?
		return new Str(str);
	};
	
	function blk__(obj){
		return obj instanceof Array ? (Block.wrap(obj)) : (obj);
	};
	
	function sym__(obj){
		// console.log "sym {obj}"
		return helpers.symbolize(String(obj));
	};
	
	function cary__(ary){
		return ary.map(function(v) {
			return typeof v == 'string' ? (v) : (v.c());
		});
	};
	
	function dump__(obj,key){
		if (obj instanceof Array) {
			return obj.map(function(v) {
				return v && v.dump ? (v.dump(key)) : (v);
			});
		} else if (obj && obj.dump) {
			return obj.dump();
		};
	};
	
	function compact__(ary){
		if (ary instanceof ListNode) {
			return ary.compact();
		};
		
		return ary.filter(function(v) {
			return v != undefined && v != null;
		});
	};
	
	function reduce__(res,ary){
		for (var i=0, items=iter$(ary), len=items.length, v; i < len; i++) {
			v = items[i];v instanceof Array ? (reduce__(res,v)) : (res.push(v));
		};
		return;
	};
	
	function flatten__(ary,compact){
		if(compact === undefined) compact = false;
		var out = [];
		for (var i=0, items=iter$(ary), len=items.length, v; i < len; i++) {
			v = items[i];v instanceof Array ? (reduce__(out,v)) : (out.push(v));
		};
		return out;
	};
	
	AST.parse = function (str,opts){
		if(opts === undefined) opts = {};
		var indent = str.match(/\t+/)[0];
		return Imba.parse(str,opts);
	};
	
	AST.inline = function (str,opts){
		if(opts === undefined) opts = {};
		return this.parse(str,opts).body();
	};
	
	AST.node = function (typ,pars){
		if (typ == 'call') {
			if (pars[0].c() == 'return') {
				pars[0] = 'tata';
			};
			return new Call(pars[0],pars[1],pars[2]);
		};
	};
	
	
	AST.escapeComments = function (str){
		if (!str) { return '' };
		return str;
	};
	
	function Indentation(a,b){
		this._open = a;
		this._close = b;
		this;
	};
	
	// should rather parse and extract the comments, no?
	exports.Indentation = Indentation; // export class 
	
	Indentation.prototype.__open = {name: 'open'};
	Indentation.prototype.open = function(v){ return this._open; }
	Indentation.prototype.setOpen = function(v){ this._open = v; return this; };
	
	Indentation.prototype.__close = {name: 'close'};
	Indentation.prototype.close = function(v){ return this._close; }
	Indentation.prototype.setClose = function(v){ this._close = v; return this; };
	
	Indentation.prototype.wrap = function (str){
		// var pre, post
		
		// console.log "INDENT {@open and JSON.stringify(@open.@meta)}"
		// console.log "OUTDENT {@close}"
		// var ov = @open and @open.@value
		// if ov and ov:length > 1
		// 	console.log "value for indent",ov
		// 	if ov.indexOf('%|%')
		// 		pre = ov.substr
		var om = this._open && this._open._meta;
		var pre = om && om.pre || '';
		var post = om && om.post || '';
		var esc = AST.escapeComments;
		var out = this._close;
		
		// the first newline should not be indented?
		str = post.replace(/^\n/,'') + str;
		str = str.replace(/^/g,"\t").replace(/\n/g,"\n\t").replace(/\n\t$/g,"\n");
		
		str = pre + '\n' + str;
		if (out instanceof Terminator) { str += out.c() };
		if (str[str.length - 1] != '\n') { str = str + '\n' };
		return str;
	};
	
	
	var INDENT = new Indentation({},{});
	
	function Stack(){
		this.reset();
	};
	
	exports.Stack = Stack; // export class 
	
	Stack.prototype.__loglevel = {name: 'loglevel'};
	Stack.prototype.loglevel = function(v){ return this._loglevel; }
	Stack.prototype.setLoglevel = function(v){ this._loglevel = v; return this; };
	
	Stack.prototype.__nodes = {name: 'nodes'};
	Stack.prototype.nodes = function(v){ return this._nodes; }
	Stack.prototype.setNodes = function(v){ this._nodes = v; return this; };
	
	Stack.prototype.__scopes = {name: 'scopes'};
	Stack.prototype.scopes = function(v){ return this._scopes; }
	Stack.prototype.setScopes = function(v){ this._scopes = v; return this; };
	
	Stack.prototype.reset = function (){
		this._nodes = [];
		this._scoping = [];
		this._scopes = []; // for analysis - should rename
		this._loglevel = 3;
		this._counter = 0;
		return this;
	};
	
	Stack.prototype.addScope = function (scope){
		this._scopes.push(scope);
		return this;
	};
	
	Stack.prototype.traverse = function (node){
		return this;
	};
	
	Stack.prototype.push = function (node){
		this._nodes.push(node);
		// not sure if we have already defined a scope?
		return this;
	};
	
	Stack.prototype.pop = function (node){
		this._nodes.pop(); // (node)
		return this;
	};
	
	Stack.prototype.parent = function (){
		return this._nodes[this._nodes.length - 2];
	};
	
	Stack.prototype.current = function (){
		return this._nodes[this._nodes.length - 1];
	};
	
	Stack.prototype.up = function (test){
		test || (test = function(v) {
			return !(v instanceof VarOrAccess);
		});
		
		if (test.prototype instanceof Node) {
			var typ = test;
			test = function(v) {
				return v instanceof typ;
			};
		};
		
		var i = this._nodes.length - 2; // key
		while (i >= 0){
			var node = this._nodes[i];
			if (test(node)) { return node };
			i -= 1;
		};
		return null;
	};
	
	Stack.prototype.relative = function (node,offset){
		if(offset === undefined) offset = 0;
		var idx = this._nodes.indexOf(node);
		return idx >= 0 ? (this._nodes[idx + offset]) : (null);
	};
	
	Stack.prototype.scope = function (lvl){
		if(lvl === undefined) lvl = 0;
		var i = this._nodes.length - 1 - lvl;
		while (i >= 0){
			var node = this._nodes[i];
			if (node._scope) { return node._scope };
			i -= 1;
		};
		return null;
	};
	
	Stack.prototype.scopes = function (){
		// include deeper scopes as well?
		var scopes = [];
		var i = this._nodes.length - 1;
		while (i >= 0){
			var node = this._nodes[i];
			if (node._scope) { scopes.push(node._scope) };
			i -= 1;
		};
		return scopes;
	};
	
	Stack.prototype.method = function (){
		return this.up(MethodDeclaration);
	};
	
	Stack.prototype.isExpression = function (){
		var i = this._nodes.length - 1;
		while (i >= 0){
			var node = this._nodes[i];
			// why are we not using isExpression here as well?
			if ((node instanceof Code) || (node instanceof Loop)) {
				return false;
			};
			if (node.isExpression()) {
				return true;
			};
			// probably not the right test - need to be more explicit
			i -= 1;
		};
		return false;
	};
	
	Stack.prototype.toString = function (){
		return "Stack(" + (this._nodes.join(" -> ")) + ")";
	};
	
	Stack.prototype.scoping = function (){
		return this._nodes.filter(function(n) {
			return n._scope;
		}).map(function(n) {
			return n._scope;
		});
	};
	
	
	// Lots of globals -- really need to deal with one stack per file / context
	module.exports.STACK = STACK = new Stack();
	
	GLOBSTACK = STACK;
	
	// use a bitmask for these
	
	function Node(){
		this.setup();
		this;
	};
	
	exports.Node = Node; // export class 
	
	Node.prototype.__o = {name: 'o'};
	Node.prototype.o = function(v){ return this._o; }
	Node.prototype.setO = function(v){ this._o = v; return this; };
	
	Node.prototype.__options = {name: 'options'};
	Node.prototype.options = function(v){ return this._options; }
	Node.prototype.setOptions = function(v){ this._options = v; return this; };
	
	Node.prototype.__traversed = {name: 'traversed'};
	Node.prototype.traversed = function(v){ return this._traversed; }
	Node.prototype.setTraversed = function(v){ this._traversed = v; return this; };
	
	Node.prototype.safechain = function (){
		return false;
	};
	
	Node.prototype.dom = function (){
		var name = "ast_" + this.constructor.name.replace(/([a-z])([A-Z])/g,"$1_$2").toLowerCase();
		// p "try to get the dom-node for this ast-node",name
		if (Imba.TAGS[name]) {
			var node = Imba.tag(name);
			node.bind(this).build();
			return node;
		} else {
			return ("[" + name + "]");
		};
	};
	
	Node.prototype.p = function (){
		
		// allow controlling this from commandline
		if (STACK.loglevel() > 0) {
			console.log.apply(console,arguments);
		};
		return this;
	};
	
	Node.prototype.setup = function (){
		this._expression = false;
		this._traversed = false;
		this._parens = false;
		this._cache = null;
		this._value = null;
		return this;
	};
	
	Node.prototype.set = function (obj){
		// console.log "setting options {JSON.stringify(obj)}"
		this._options || (this._options = {});
		for (var i=0, keys=Object.keys(obj), l=keys.length; i < l; i++){
			this._options[keys[i]] = obj[keys[i]];
		};
		return this;
	};
	
	// get and set
	Node.prototype.option = function (key,val){
		if (val != undefined) {
			// console.log "setting option {key} {val}"
			this._options || (this._options = {});
			this._options[key] = val;
			return this;
		};
		
		return this._options && this._options[key];
	};
	
	Node.prototype.configure = function (obj){
		return this.set(obj);
	};
	
	Node.prototype.region = function (){
		return [0,0];
	};
	
	Node.prototype.loc = function (){
		return [0,0];
	};
	
	Node.prototype.compile = function (){
		return this;
	};
	
	Node.prototype.visit = function (){
		return this;
	};
	
	Node.prototype.stack = function (){
		return STACK;
	};
	
	// should rather do traversals
	// o = {}, up, key, index
	Node.prototype.traverse = function (){
		if (this._traversed) {
			return this;
		};
		// NODES.push(self)
		this._traversed = true;
		STACK.push(this);
		this.visit(STACK);
		STACK.pop(this);
		return this;
	};
	
	Node.prototype.inspect = function (){
		return {type: this.constructor.toString()};
	};
	
	Node.prototype.js = function (o){
		return "NODE";
	};
	
	Node.prototype.toString = function (){
		return "" + (this.constructor.name);
	};
	
	// swallow might be better name
	Node.prototype.consume = function (node){
		if (node instanceof PushAssign) {
			return new PushAssign(node.op(),node.left(),this);
		};
		
		if (node instanceof Assign) {
			// p "consume assignment".cyan
			// node.right = self
			return OP(node.op(),node.left(),this);
		} else if (node instanceof Op) {
			return OP(node.op(),node.left(),this);
		} else if (node instanceof Return) {
			// p "consume return".cyan
			return new Return(this);
		};
		return this;
	};
	
	Node.prototype.toExpression = function (){
		this._expression = true;
		return this;
	};
	
	Node.prototype.forceExpression = function (){
		this._expression = true;
		return this;
	};
	
	Node.prototype.isExpressable = function (){
		return true;
	};
	
	Node.prototype.isExpression = function (){
		return this._expression || false;
	};
	
	Node.prototype.hasSideEffects = function (){
		return true;
	};
	
	Node.prototype.isUsed = function (){
		return true;
	};
	
	Node.prototype.shouldParenthesize = function (){
		return false;
	};
	
	Node.prototype.block = function (){
		return Block.wrap([this]);
	};
	
	Node.prototype.node = function (){
		return this;
	};
	
	Node.prototype.scope__ = function (){
		return STACK.scope();
	};
	
	Node.prototype.up = function (){
		return STACK.parent();
	};
	
	Node.prototype.util = function (){
		return Util;
	};
	
	Node.prototype.receiver = function (){
		return this;
	};
	
	Node.prototype.addExpression = function (expr){
		// might be better to nest this up after parsing is done?
		// p "addExpression {self} <- {expr}"
		var node = new ExpressionBlock([this]);
		return node.addExpression(expr);
	};
	
	
	Node.prototype.indented = function (a,b){
		// this is a _BIG_ hack
		if (b instanceof Array) {
			this.add(b[0]);
			b = b[1];
		};
		
		// if indent and indent.match(/\:/)
		this._indentation || (this._indentation = a && b ? (new Indentation(a,b)) : (INDENT));
		return this;
	};
	
	Node.prototype.prebreak = function (term){
		// in options instead?
		// console.log "prebreak!!!!"
		// @prebreak = @prebreak or term
		if(term === undefined) term = '\n';
		return this;
	};
	
	Node.prototype.invert = function (){
		return OP('!',this);
	};
	
	Node.prototype.cache = function (o){
		if(o === undefined) o = {};
		this._cache = o;
		o.var = this.scope__().temporary(this,o);
		o.lookups = 0;
		return this;
	};
	
	Node.prototype.cachevar = function (){
		return this._cache && this._cache.var;
	};
	
	Node.prototype.decache = function (){
		if (this._cache) {
			this.cachevar().free();
			this._cache = null;
		};
		return this;
	};
	
	// is this without side-effects? hmm - what does it even do?
	Node.prototype.predeclare = function (){
		if (this._cache) {
			this.scope__().vars().swap(this._cache.var,this);
		};
		return this;
	};
	
	// the "name-suggestion" for nodes if they need to be cached
	Node.prototype.alias = function (){
		return null;
	};
	
	Node.prototype.warn = function (text,opts){
		if(opts === undefined) opts = {};
		opts.message = text;
		opts.loc || (opts.loc = this.loc());
		this.scope__().root().warn(opts);
		return this;
	};
	
	Node.prototype.c = function (o){
		var indent;
		var s = STACK;
		var ch = this._cache;
		if (ch && ch.cached) { return this.c_cached(ch) };
		
		s.push(this);
		if (o && o.expression) this.forceExpression();
		
		v8 && console.log(v8.hasFastObjectElements(this));
		
		if (o && o.indent) {
			this._indentation || (this._indentation = INDENT);
		};
		
		var out = this.js(s,o);
		
		// really? why not call this somewhere else?
		var paren = this.shouldParenthesize();
		
		if (indent = this._indentation) {
			out = indent.wrap(out,o);
		};
		
		// should move this somewhere else really
		if (paren) { out = ("(" + out + ")") };
		if (o && o.braces) {
			if (indent) {
				out = '{' + out + '}';
			} else {
				out = '{ ' + out + ' }';
			};
		};
		
		s.pop(this);
		
		if (ch = this._cache) {
			if (!(ch.manual)) { out = ("" + (ch.var.c()) + "=" + out) };
			var par = s.current();
			if ((par instanceof Access) || (par instanceof Op)) { out = '(' + out + ')' }; // others? # 
			ch.cached = true;
		};
		return out;
	};
	
	Node.prototype.c_cached = function (cache){
		cache.lookups++;
		if (cache.uses == cache.lookups) { cache.var.free() };
		return cache.var.c(); // recompile every time??
	};
	
	
	function ValueNode(value){
		this.setup();
		this._value = this.load(value);
	};
	
	subclass$(ValueNode,Node);
	exports.ValueNode = ValueNode; // export class 
	
	ValueNode.prototype.__value = {name: 'value'};
	ValueNode.prototype.value = function(v){ return this._value; }
	ValueNode.prototype.setValue = function(v){ this._value = v; return this; };
	
	ValueNode.prototype.load = function (value){
		return value;
	};
	
	ValueNode.prototype.js = function (o){
		return typeof this._value == 'string' ? (this._value) : (this._value.c());
	};
	
	ValueNode.prototype.visit = function (){
		
		if (this._value instanceof Node) { this._value.traverse() }; //  && @value:traverse
		return this;
	};
	
	ValueNode.prototype.region = function (){
		return [this._value._loc,this._value._loc + this._value._len];
	};
	
	
	
	function Statement(){ ValueNode.apply(this,arguments) };
	
	subclass$(Statement,ValueNode);
	exports.Statement = Statement; // export class 
	Statement.prototype.isExpressable = function (){
		return false;
	};
	
	
	
	function Meta(){ ValueNode.apply(this,arguments) };
	
	subclass$(Meta,ValueNode);
	exports.Meta = Meta; // export class 
	
	
	function Comment(){ Meta.apply(this,arguments) };
	
	subclass$(Comment,Meta);
	exports.Comment = Comment; // export class 
	Comment.prototype.c = function (o){
		var v = this._value._value;
		// p @value.type
		if (o && o.expression || v.match(/\n/) || this._value.type() == 'HERECOMMENT') { // multiline?
			return "/*" + v + "*/";
		} else {
			return "// " + v;
		};
	};
	
	
	function Terminator(v){
		this._value = v;
		this;
	};
	
	subclass$(Terminator,Meta);
	exports.Terminator = Terminator; // export class 
	Terminator.prototype.traverse = function (){
		return this;
	};
	
	Terminator.prototype.c = function (){
		return this._value.c();
		// var v = value.replace(/\\n/g,'\n')
		return this.v(); // .split()
		// v.split("\n").map(|v| v ? " // {v}" : v).join("\n")
	};
	
	
	function Newline(v){
		this._traversed = false;
		this._value = v || '\n';
	};
	
	subclass$(Newline,Terminator);
	exports.Newline = Newline; // export class 
	Newline.prototype.c = function (){
		return c__(this._value);
	};
	
	
	
	// weird place?
	function Index(){ ValueNode.apply(this,arguments) };
	
	subclass$(Index,ValueNode);
	exports.Index = Index; // export class 
	Index.prototype.js = function (o){
		return this._value.c();
	};
	
	
	function ListNode(list){
		this.setup();
		this._nodes = this.load(list || []);
		this._indentation = null;
	};
	
	// PERF acces @nodes directly?
	subclass$(ListNode,Node);
	exports.ListNode = ListNode; // export class 
	
	ListNode.prototype.__nodes = {name: 'nodes'};
	ListNode.prototype.nodes = function(v){ return this._nodes; }
	ListNode.prototype.setNodes = function(v){ this._nodes = v; return this; };
	
	ListNode.prototype.list = function (){
		return this._nodes;
	};
	
	ListNode.prototype.compact = function (){
		this._nodes = compact__(this._nodes);
		return this;
	};
	
	ListNode.prototype.load = function (list){
		return list;
	};
	
	ListNode.prototype.concat = function (other){
		// need to store indented content as well?
		this._nodes = this.nodes().concat(other instanceof Array ? (other) : (other.nodes()));
		return this;
	};
	
	ListNode.prototype.swap = function (item,other){
		var idx = this.indexOf(item);
		if (idx >= 0) { this.nodes()[idx] = other };
		return this;
	};
	
	ListNode.prototype.push = function (item){
		this._nodes.push(item);
		return this;
	};
	
	ListNode.prototype.add = function (item){
		this._nodes.push(item);
		return this;
	};
	
	ListNode.prototype.unshift = function (item,br){
		if (br) { this._nodes.unshift(BR) };
		this._nodes.unshift(item);
		return this;
	};
	
	// test
	ListNode.prototype.slice = function (a,b){
		return new this.constructor(this._nodes.slice(a,b));
	};
	
	
	
	ListNode.prototype.break = function (br,pre){
		if(pre === undefined) pre = false;
		if (typeof br == 'string') { br = new Terminator(br) };
		pre ? (this.unshift(br)) : (this.push(br));
		return this;
	};
	
	ListNode.prototype.some = function (cb){
		for (var i=0, ary=iter$(this._nodes), len=ary.length; i < len; i++) {
			if (cb(ary[i])) { return true };
		};
		return false;
	};
	
	ListNode.prototype.every = function (cb){
		for (var i=0, ary=iter$(this._nodes), len=ary.length; i < len; i++) {
			if (!cb(ary[i])) { return false };
		};
		return true;
	};
	
	ListNode.prototype.filter = function (cb){
		return this._nodes.filter(cb);
	};
	
	ListNode.prototype.pluck = function (cb){
		var item = this.filter(cb)[0];
		if (item) { this.remove(item) };
		return item;
	};
	
	ListNode.prototype.indexOf = function (item){
		return this._nodes.indexOf(item);
	};
	
	ListNode.prototype.index = function (i){
		return this._nodes[i];
	};
	
	ListNode.prototype.remove = function (item){
		var idx = this._nodes.indexOf(item);
		if (idx >= 0) { this._nodes.splice(idx,1) };
		return this;
	};
	
	ListNode.prototype.removeAt = function (idx){
		var item = this._nodes[idx];
		if (idx >= 0) { this._nodes.splice(idx,1) };
		return item;
	};
	
	
	ListNode.prototype.replace = function (original,replacement){
		var idx = this._nodes.indexOf(original);
		if (idx >= 0) {
			if (replacement instanceof Array) {
				// p "replaceing with array of items"
				this._nodes.splice.apply(this._nodes,[].concat([idx,1], [].slice.call(replacement)));
			} else {
				this._nodes[idx] = replacement;
			};
		};
		return this;
	};
	
	ListNode.prototype.first = function (){
		return this._nodes[0];
	};
	
	ListNode.prototype.last = function (){
		var i = this._nodes.length;
		while (i){
			i = i - 1;
			var v = this._nodes[i];
			if (!((v instanceof Meta))) { return v };
		};
		return null;
	};
	
	ListNode.prototype.map = function (fn){
		return this._nodes.map(fn);
	};
	
	ListNode.prototype.forEach = function (fn){
		return this._nodes.forEach(fn);
	};
	
	ListNode.prototype.remap = function (fn){
		this._nodes = this.map(fn);
		return this;
	};
	
	ListNode.prototype.count = function (){
		return this._nodes.length;
	};
	
	ListNode.prototype.realCount = function (){
		var k = 0;
		for (var i=0, ary=iter$(this._nodes), len=ary.length, node; i < len; i++) {
			node = ary[i];if (node && !(node instanceof Meta)) { k++ };
		};
		return k;
	};
	
	ListNode.prototype.visit = function (){
		for (var i=0, ary=iter$(this._nodes), len=ary.length, node; i < len; i++) {
			node = ary[i];node && node.traverse();
		};
		return this;
	};
	
	ListNode.prototype.isExpressable = function (){
		for (var i=0, ary=iter$(this.nodes()), len=ary.length, node; i < len; i++) {
			node = ary[i];if (node && !(node.isExpressable())) { return false };
		};
		// return no unless nodes.every(|v| v.isExpressable )
		return true;
	};
	
	ListNode.prototype.toArray = function (){
		return this._nodes;
	};
	
	ListNode.prototype.delimiter = function (){
		return this._delimiter || ",";
	};
	
	ListNode.prototype.js = function (o,pars){
		if(!pars||pars.constructor !== Object) pars = {};
		var nodes = pars.nodes !== undefined ? pars.nodes : this._nodes;
		var delim = ',';
		var express = delim != ';';
		var last = this.last();
		
		var i = 0;
		var l = nodes.length;
		var str = "";
		
		for (var j=0, ary=iter$(nodes), len=ary.length, arg; j < len; j++) {
			arg = ary[j];var part = typeof arg == 'string' ? (arg) : ((arg ? (arg.c({expression: express})) : ('')));
			str += part;
			if (part && (!express || arg != last) && !(arg instanceof Meta)) { str += delim };
		};
		
		return str;
	};
	
	
	
	function ArgList(){ ListNode.apply(this,arguments) };
	
	subclass$(ArgList,ListNode);
	exports.ArgList = ArgList; // export class 
	ArgList.prototype.indented = function (a,b){
		this._indentation || (this._indentation = a && b ? (new Indentation(a,b)) : (INDENT));
		return this;
	};
	
	
	// def hasSplat
	// 	@nodes.some do |v| v isa Splat
	// def delimiter
	// 	","
	
	
	function AssignList(){ ArgList.apply(this,arguments) };
	
	subclass$(AssignList,ArgList);
	exports.AssignList = AssignList; // export class 
	AssignList.prototype.concat = function (other){
		if (this._nodes.length == 0 && (other instanceof AssignList)) {
			return other;
		} else {
			AssignList.__super__.concat.call(this,other);
		};
		// need to store indented content as well?
		// @nodes = nodes.concat(other isa Array ? other : other.nodes)
		return this;
	};
	
	
	
	function Block(list){
		this.setup();
		// @nodes = compact__(flatten__(list)) or []
		this._nodes = list || [];
		this._head = null;
		this._indentation = null;
	};
	
	subclass$(Block,ListNode);
	exports.Block = Block; // export class 
	
	Block.prototype.__head = {name: 'head'};
	Block.prototype.head = function(v){ return this._head; }
	Block.prototype.setHead = function(v){ this._head = v; return this; };
	
	Block.wrap = function (ary){
		if (!((ary instanceof Array))) {
			throw new SyntaxError("what");
		};
		return ary.length == 1 && (ary[0] instanceof Block) ? (ary[0]) : (new Block(ary));
	};
	
	Block.prototype.visit = function (){
		if (this._scope) { this._scope.visit() };
		
		for (var i=0, ary=iter$(this._nodes), len=ary.length, node; i < len; i++) {
			node = ary[i];node && node.traverse();
		};
		return this;
	};
	
	Block.prototype.block = function (){
		return this;
	};
	
	Block.prototype.indented = function (a,b){
		this._indentation || (this._indentation = a && b ? (new Indentation(a,b)) : (INDENT));
		return this;
	};
	
	Block.prototype.loc = function (){
		// rather indents, no?
		var opt;
		if (opt = this.option('ends')) {
			// p "location is",opt
			var a = opt[0].loc();
			var b = opt[1].loc();
			
			if (!a) { this.p(("no loc for " + (opt[0]))) };
			if (!b) { this.p(("no loc for " + (opt[1]))) };
			
			return [a[0],b[1]];
		} else {
			return [0,0];
		};
	};
	
	// go through children and unwrap inner nodes
	Block.prototype.unwrap = function (){
		var ary = [];
		for (var i=0, items=iter$(this.nodes()), len=items.length, node; i < len; i++) {
			node = items[i];if (node instanceof Block) {
				// p "unwrapping inner block"
				ary.push.apply(ary,node.unwrap());
			} else {
				ary.push(node);
			};
		};
		return ary;
	};
	
	Block.prototype.push = function (item){
		this._nodes.push(item);
		return this;
	};
	
	Block.prototype.add = function (item){
		this._nodes.push(item);
		return this;
	};
	
	// This is just to work as an inplace replacement of nodes.coffee
	// After things are working okay we'll do bigger refactorings
	Block.prototype.compile = function (o){
		if(o === undefined) o = {};
		var root = new Root(this,o);
		return root.compile(o);
	};
	
	
	// Not sure if we should create a separate block?
	Block.prototype.analyze = function (o){
		// p "analyzing block!!!",o
		if(o === undefined) o = {};
		return this;
	};
	
	Block.prototype.cpart = function (node){
		var out = typeof node == 'string' ? (node) : ((node ? (node.c()) : ("")));
		if (out == null || out == undefined || out == "") { return "" };
		
		if (out instanceof Array) {
			var str = "";
			var l = out.length;
			var i = 0;
			while (i < l){
				str += this.cpart(out[i++]);
			};
			return str;
		};
		
		var hasSemiColon = SEMICOLON_TEST.test(out);
		if (!(hasSemiColon || (node instanceof Meta))) { out += ";" };
		return out;
	};
	
	Block.prototype.js = function (o,opts){
		var ast = this._nodes;
		var l = ast.length;
		// really?
		var express = this.isExpression() || o.isExpression() || (this.option('express') && this.isExpressable());
		if (ast.length == 0) { return null };
		
		if (express) {
			return Block.__super__.js.call(this,o,{nodes: ast});
		};
		
		var str = "";
		for (var i=0, ary=iter$(ast), len=ary.length; i < len; i++) {
			str += this.cpart(ary[i]);
		};
		
		// now add the head items as well
		if (this._head && this._head.length > 0) {
			var prefix = "";
			for (var i=0, ary=iter$(this._head), len=ary.length; i < len; i++) {
				var hv = this.cpart(ary[i]);
				if (hv) { prefix += hv + '\n' };
			};
			str = prefix + str;
		};
		return str;
	};
	
	
	// Should this create the function as well?
	Block.prototype.defers = function (original,replacement){
		var idx = this._nodes.indexOf(original);
		if (idx >= 0) { this._nodes[idx] = replacement };
		var rest = this._nodes.splice(idx + 1);
		return rest;
	};
	
	Block.prototype.consume = function (node){
		var before;
		if (node instanceof TagTree) { // special case?!?
			this._nodes = this._nodes.map(function(child) {
				return child.consume(node);
			});
			if (this._nodes.length > 1) { this._nodes = [new Arr(new ArgList(this._nodes))] };
			
			
			return this;
		};
		
		// can also return super if it is expressable, but should we really?
		if (before = this.last()) {
			var after = before.consume(node);
			if (after != before) {
				// p "replace node in block {before} -> {after}"
				if (after instanceof Block) {
					// p "replaced with block -- should basically add it instead?"
					after = after.nodes();
				};
				
				this.replace(before,after);
			};
		};
		// really?
		return this;
	};
	
	
	Block.prototype.isExpressable = function (){
		if (!this._nodes.every(function(v) {
			return v.isExpressable();
		})) { return false };
		return true;
	};
	
	Block.prototype.isExpression = function (){
		
		return this.option('express') || this._expression;
	};
	
	
	
	// this is almost like the old VarDeclarations but without the values
	function VarBlock(){ ListNode.apply(this,arguments) };
	
	subclass$(VarBlock,ListNode);
	exports.VarBlock = VarBlock; // export class 
	VarBlock.prototype.load = function (list){
		var first = list[0];
		
		if (first instanceof Assign) {
			this._type = first.left()._type;
		} else if (first instanceof VarReference) {
			this._type = first._type;
		};
		// p "here {list[0]} - {@type}"
		// @type = list[0] and list[0].type
		return list;
	};
	
	// TODO All these inner items should rather be straight up literals
	// or basic localvars - without any care whatsoever about adding var to the
	// beginning etc. 
	VarBlock.prototype.addExpression = function (expr){
		// p "VarBlock.addExpression {self} <- {expr}"
		
		if (expr instanceof Assign) {
			// make sure the left-side is a var-reference
			// this should be a different type of assign, no?
			if (expr.left() instanceof VarOrAccess) {
				expr.setLeft(new VarReference(expr.left().value(),this._type));
			};
			
			this.push(expr);
		} else if (expr instanceof Assign) {
			this.addExpression(expr.left()); // make sure this is a valid thing?
			// make this into a tuple instead
			// does not need to be a tuple?
			return new TupleAssign('=',new Tuple(this.nodes()),expr.right());
		} else if (expr instanceof VarOrAccess) {
			// this is really a VarReference
			this.push(new VarReference(expr.value(),this._type));
		} else if ((expr instanceof Splat) && (expr.node() instanceof VarOrAccess)) {
			// p "is a splat - only allowed in tuple-assignment"
			// what?
			expr.setValue(new VarReference(expr.node().value(),this._type));
			this.push(expr);
		} else {
			this.p(("VarBlock.addExpression " + this + " <- " + expr));
			throw "VarBlock does not allow non-variable expressions";
		};
		return this;
	};
	
	
	VarBlock.prototype.isExpressable = function (){
		// we would need to force-drop the variables, makes little sense
		// but, it could be, could just push the variables out?
		return false;
	};
	
	VarBlock.prototype.js = function (o){
		// p "VarBlock"
		// for n in @nodes
		// 	p "VarBlock child {n}"
		var code = compact__(flatten__(cary__(this.nodes())));
		code = code.filter(function(n) {
			return n != null && n != undefined && n != EMPTY;
		});
		var out = code.join(",");
		// we just need to trust that the variables have been autodeclared beforehand
		// if we are inside an expression
		if (!(o.isExpression())) { out = "var " + out };
		return out;
	};
	
	
	VarBlock.prototype.consume = function (node){
		// It doesnt make much sense for a VarBlock to consume anything
		// it should probably return void for methods
		return this;
	};
	
	
	
	// Could inherit from valueNode
	function Parens(){ ValueNode.apply(this,arguments) };
	
	subclass$(Parens,ValueNode);
	exports.Parens = Parens; // export class 
	Parens.prototype.load = function (value){
		this._noparen = false;
		return (value instanceof Block) && value.count() == 1 ? (value.first()) : (value);
	};
	
	Parens.prototype.js = function (o){
		
		var par = this.up();
		var v = this._value;
		
		if (v instanceof Func) { this._noparen = true };
		// p "compile parens {v} {v isa Block and v.count}"
		// p "Parens up {par} {o.isExpression}"
		if (par instanceof Block) {
			// is it worth it?
			if (!(o.isExpression())) { this._noparen = true };
			return v instanceof Array ? (cary__(v)) : (v.c({expression: o.isExpression()}));
		} else {
			return v instanceof Array ? (cary__(v)) : (v.c({expression: true}));
		};
	};
	
	Parens.prototype.set = function (obj){
		console.log(("Parens set " + (JSON.stringify(obj))));
		return Parens.__super__.set.call(this,obj);
	};
	
	
	Parens.prototype.shouldParenthesize = function (){
		// no need to parenthesize if this is a line in a block
		if (this._noparen) { return false }; //  or par isa ArgList
		return true;
	};
	
	
	Parens.prototype.prebreak = function (br){
		Parens.__super__.prebreak.call(this,br);
		console.log("PREBREAK");
		if (this._value) { this._value.prebreak(br) };
		return this;
	};
	
	
	Parens.prototype.isExpressable = function (){
		return this._value.isExpressable();
	};
	
	Parens.prototype.consume = function (node){
		return this._value.consume(node);
	};
	
	
	
	// Could inherit from valueNode
	// an explicit expression-block (with parens) is somewhat different
	// can be used to return after an expression
	function ExpressionBlock(){ ListNode.apply(this,arguments) };
	
	subclass$(ExpressionBlock,ListNode);
	exports.ExpressionBlock = ExpressionBlock; // export class 
	ExpressionBlock.prototype.c = function (){
		return this.map(function(item) {
			return item.c();
		}).join(",");
	};
	
	ExpressionBlock.prototype.consume = function (node){
		return this.value().consume(node);
	};
	
	ExpressionBlock.prototype.addExpression = function (expr){
		// Need to take care of the splat here to.. hazzle
		if (expr.node() instanceof Assign) {
			// p "is assignment!"
			this.push(expr.left());
			// make this into a tuple instead
			// possibly fix this as well?!?
			return new TupleAssign('=',new Tuple(this.nodes()),expr.right());
		} else {
			this.push(expr);
		};
		return this;
	};
	
	
	
	
	// STATEMENTS
	
	function Return(v){
		this._traversed = false;
		this._value = (v instanceof ArgList) && v.count() == 1 ? (v.last()) : (v);
		// @prebreak = v and v.@prebreak
		// console.log "return?!? {v}",@prebreak
		// if v isa ArgList and v.count == 1
		return this;
	};
	
	subclass$(Return,Statement);
	exports.Return = Return; // export class 
	
	Return.prototype.__value = {name: 'value'};
	Return.prototype.value = function(v){ return this._value; }
	Return.prototype.setValue = function(v){ this._value = v; return this; };
	
	Return.prototype.visit = function (){
		if (this._value && this._value.traverse) { return this._value.traverse() };
	};
	
	Return.prototype.js = function (o){
		var v = this._value;
		
		if (v instanceof ArgList) {
			return ("return [" + (v.c({expression: true})) + "]");
		} else if (v) {
			return ("return " + (v.c({expression: true})));
		} else {
			return "return";
		};
	};
	
	Return.prototype.c = function (){
		if (!this.value() || this.value().isExpressable()) { return Return.__super__.c.apply(this,arguments) };
		// p "return must cascade into value".red
		return this.value().consume(this).c();
	};
	
	Return.prototype.consume = function (node){
		return this;
	};
	
	
	function ImplicitReturn(){ Return.apply(this,arguments) };
	
	subclass$(ImplicitReturn,Return);
	exports.ImplicitReturn = ImplicitReturn; // export class 
	
	
	function GreedyReturn(){ ImplicitReturn.apply(this,arguments) };
	
	subclass$(GreedyReturn,ImplicitReturn);
	exports.GreedyReturn = GreedyReturn; // export class 
	
	
	// cannot live inside an expression(!)
	function Throw(){ Statement.apply(this,arguments) };
	
	subclass$(Throw,Statement);
	exports.Throw = Throw; // export class 
	Throw.prototype.js = function (o){
		return "throw " + (this.value().c());
	};
	
	Throw.prototype.consume = function (node){
		// ROADMAP should possibly consume to the value of throw and then throw?
		return this;
	};
	
	
	
	function LoopFlowStatement(lit,expr){
		this.setLiteral(lit);
		this.setExpression(expr); // && ArgList.new(expr) # really?
	};
	
	subclass$(LoopFlowStatement,Statement);
	exports.LoopFlowStatement = LoopFlowStatement; // export class 
	
	LoopFlowStatement.prototype.__literal = {name: 'literal'};
	LoopFlowStatement.prototype.literal = function(v){ return this._literal; }
	LoopFlowStatement.prototype.setLiteral = function(v){ this._literal = v; return this; };
	
	LoopFlowStatement.prototype.__expression = {name: 'expression'};
	LoopFlowStatement.prototype.expression = function(v){ return this._expression; }
	LoopFlowStatement.prototype.setExpression = function(v){ this._expression = v; return this; };
	
	LoopFlowStatement.prototype.visit = function (){
		if (this.expression()) { return this.expression().traverse() };
	};
	
	LoopFlowStatement.prototype.consume = function (node){
		// p "break/continue should consume?!"
		return this;
	};
	
	LoopFlowStatement.prototype.c = function (){
		if (!this.expression()) { return LoopFlowStatement.__super__.c.apply(this,arguments) };
		// get up to the outer loop
		var _loop = STACK.up(Loop);
		// p "found loop?",_loop
		
		// need to fix the grammar for this. Right now it 
		// is like a fake call, but should only care about the first argument
		var expr = this.expression();
		
		if (_loop.catcher()) {
			expr = expr.consume(_loop.catcher());
			var copy = new this.constructor(this.literal());
			return new Block([expr,copy]).c();
		} else if (expr) {
			copy = new this.constructor(this.literal());
			return new Block([expr,copy]).c();
		} else {
			return LoopFlowStatement.__super__.c.apply(this,arguments);
		};
		// return "loopflow"
	};
	
	
	
	function BreakStatement(){ LoopFlowStatement.apply(this,arguments) };
	
	subclass$(BreakStatement,LoopFlowStatement);
	exports.BreakStatement = BreakStatement; // export class 
	BreakStatement.prototype.js = function (o){
		return "break";
	};
	
	
	function ContinueStatement(){ LoopFlowStatement.apply(this,arguments) };
	
	subclass$(ContinueStatement,LoopFlowStatement);
	exports.ContinueStatement = ContinueStatement; // export class 
	ContinueStatement.prototype.js = function (o){
		return "continue";
	};
	
	
	function DebuggerStatement(){ Statement.apply(this,arguments) };
	
	subclass$(DebuggerStatement,Statement);
	exports.DebuggerStatement = DebuggerStatement; // export class 
	
	
	
	// PARAMS
	
	function Param(name,defaults,typ){
		// could have introduced bugs by moving back to identifier here
		this._traversed = false;
		this._name = name; // .value # this is an identifier(!)
		this._defaults = defaults;
		this._typ = typ;
		this._variable = null;
	};
	
	subclass$(Param,Node);
	exports.Param = Param; // export class 
	
	Param.prototype.__name = {name: 'name'};
	Param.prototype.name = function(v){ return this._name; }
	Param.prototype.setName = function(v){ this._name = v; return this; };
	
	Param.prototype.__index = {name: 'index'};
	Param.prototype.index = function(v){ return this._index; }
	Param.prototype.setIndex = function(v){ this._index = v; return this; };
	
	Param.prototype.__defaults = {name: 'defaults'};
	Param.prototype.defaults = function(v){ return this._defaults; }
	Param.prototype.setDefaults = function(v){ this._defaults = v; return this; };
	
	Param.prototype.__splat = {name: 'splat'};
	Param.prototype.splat = function(v){ return this._splat; }
	Param.prototype.setSplat = function(v){ this._splat = v; return this; };
	
	Param.prototype.__variable = {name: 'variable'};
	Param.prototype.variable = function(v){ return this._variable; }
	Param.prototype.setVariable = function(v){ this._variable = v; return this; };
	
	// what about object-params?
	
	Param.prototype.js = function (o){
		if (this._variable) { return this._variable.c() };
		
		if (this.defaults()) {
			return "if(" + (this.name().c()) + " == null) " + (this.name().c()) + " = " + (this.defaults().c());
		};
		// see if this is the initial declarator?
	};
	
	Param.prototype.visit = function (){
		var variable_, v_;
		if (this._defaults) { this._defaults.traverse() };
		(variable_=this.variable()) || ((this.setVariable(v_=this.scope__().register(this.name(),this)),v_));
		
		if (this._name instanceof Identifier) {
			// change type here?
			if (this._name._value) { this._name._value._type = "PARAMVAR" };
			this._name.references(this._variable);
			// console.log "got here!! {@name:constructor}"
			// @name.@token.@variable = @variable if @name.@token
		};
		
		return this;
	};
	
	Param.prototype.assignment = function (){
		return OP('=',this.variable().accessor(),this.defaults());
	};
	
	Param.prototype.isExpressable = function (){
		return !this.defaults() || this.defaults().isExpressable();
		// p "visiting param!!!"
	};
	
	Param.prototype.dump = function (){
		return {loc: this.loc()};
	};
	
	Param.prototype.loc = function (){
		return this._name && this._name.region();
	};
	
	
	
	function SplatParam(){ Param.apply(this,arguments) };
	
	subclass$(SplatParam,Param);
	exports.SplatParam = SplatParam; // export class 
	SplatParam.prototype.loc = function (){
		// hacky.. cannot know for sure that this is right?
		var r = this.name().region();
		return [r[0] - 1,r[1]];
	};
	
	
	function BlockParam(){ Param.apply(this,arguments) };
	
	subclass$(BlockParam,Param);
	exports.BlockParam = BlockParam; // export class 
	BlockParam.prototype.c = function (){
		return "blockparam";
	};
	
	BlockParam.prototype.loc = function (){
		// hacky.. cannot know for sure that this is right?
		var r = this.name().region();
		return [r[0] - 1,r[1]];
	};
	
	
	
	function OptionalParam(){ Param.apply(this,arguments) };
	
	subclass$(OptionalParam,Param);
	exports.OptionalParam = OptionalParam; // export class 
	
	
	function NamedParam(){ Param.apply(this,arguments) };
	
	subclass$(NamedParam,Param);
	exports.NamedParam = NamedParam; // export class 
	
	
	function RequiredParam(){ Param.apply(this,arguments) };
	
	subclass$(RequiredParam,Param);
	exports.RequiredParam = RequiredParam; // export class 
	
	
	function NamedParams(){ ListNode.apply(this,arguments) };
	
	subclass$(NamedParams,ListNode);
	exports.NamedParams = NamedParams; // export class 
	
	NamedParams.prototype.__index = {name: 'index'};
	NamedParams.prototype.index = function(v){ return this._index; }
	NamedParams.prototype.setIndex = function(v){ this._index = v; return this; };
	
	NamedParams.prototype.__variable = {name: 'variable'};
	NamedParams.prototype.variable = function(v){ return this._variable; }
	NamedParams.prototype.setVariable = function(v){ this._variable = v; return this; };
	
	NamedParams.prototype.load = function (list){
		var load = function(k) {
			return new NamedParam(k.key(),k.value());
		};
		return list instanceof Obj ? (list.value().map(load)) : (list);
	};
	
	NamedParams.prototype.visit = function (){
		var s = this.scope__();
		this._variable || (this._variable = s.temporary(this,{pool: 'keypars'}));
		this._variable.predeclared();
		
		// this is a listnode, which will automatically traverse
		// and visit all children
		NamedParams.__super__.visit.apply(this,arguments);
		// register the inner variables as well(!)
		return this;
	};
	
	NamedParams.prototype.name = function (){
		return this.variable().c();
	};
	
	NamedParams.prototype.js = function (o){
		return "namedpar";
	};
	
	
	function IndexedParam(){ Param.apply(this,arguments) };
	
	subclass$(IndexedParam,Param);
	exports.IndexedParam = IndexedParam; // export class 
	
	IndexedParam.prototype.__parent = {name: 'parent'};
	IndexedParam.prototype.parent = function(v){ return this._parent; }
	IndexedParam.prototype.setParent = function(v){ this._parent = v; return this; };
	
	IndexedParam.prototype.__subindex = {name: 'subindex'};
	IndexedParam.prototype.subindex = function(v){ return this._subindex; }
	IndexedParam.prototype.setSubindex = function(v){ this._subindex = v; return this; };
	
	IndexedParam.prototype.visit = function (){
		// p "VISIT PARAM {name}!"
		// ary.[-1] # possible
		// ary.(-1) # possible
		// str(/ok/,-1)
		// scope.register(@name,self)
		// BUG The defaults should probably be looked up like vars
		var variable_, v_;
		(variable_=this.variable()) || ((this.setVariable(v_=this.scope__().register(this.name(),this)),v_));
		this.variable().proxy(this.parent().variable(),this.subindex());
		return this;
	};
	
	
	
	function ArrayParams(){ ListNode.apply(this,arguments) };
	
	subclass$(ArrayParams,ListNode);
	exports.ArrayParams = ArrayParams; // export class 
	
	ArrayParams.prototype.__index = {name: 'index'};
	ArrayParams.prototype.index = function(v){ return this._index; }
	ArrayParams.prototype.setIndex = function(v){ this._index = v; return this; };
	
	ArrayParams.prototype.__variable = {name: 'variable'};
	ArrayParams.prototype.variable = function(v){ return this._variable; }
	ArrayParams.prototype.setVariable = function(v){ this._variable = v; return this; };
	
	ArrayParams.prototype.visit = function (){
		var s = this.scope__();
		this._variable || (this._variable = s.temporary(this,{pool: 'keypars'}));
		this._variable.predeclared();
		
		// now when we loop through these inner params - we create the pars
		// with the correct name, but bind them to the parent
		return ArrayParams.__super__.visit.apply(this,arguments);
	};
	
	ArrayParams.prototype.name = function (){
		return this.variable().c();
	};
	
	ArrayParams.prototype.load = function (list){
		var self=this;
		if (!((list instanceof Arr))) { return null };
		// p "loading arrayparams"
		// try the basic first
		if (!(list.splat())) {
			return list.value().map(function(v,i) {
				// must make sure the params are supported here
				// should really not parse any array at all(!)
				var name = v;
				if (v instanceof VarOrAccess) {
					// p "varoraccess {v.value}"
					// FIX?
					name = v.value().value();
					// this is accepted
				};
				return self.parse(name,v,i);
			});
		};
	};
	
	ArrayParams.prototype.parse = function (name,child,i){
		var param = new IndexedParam(name,null);
		
		param.setParent(this);
		param.setSubindex(i);
		return param;
	};
	
	ArrayParams.prototype.head = function (ast){
		// "arrayparams"
		return this;
	};
	
	
	function ParamList(){ ListNode.apply(this,arguments) };
	
	subclass$(ParamList,ListNode);
	exports.ParamList = ParamList; // export class 
	
	ParamList.prototype.__splat = {name: 'splat'};
	ParamList.prototype.splat = function(v){ return this._splat; }
	ParamList.prototype.setSplat = function(v){ this._splat = v; return this; };
	
	ParamList.prototype.__block = {name: 'block'};
	ParamList.prototype.block = function(v){ return this._block; }
	ParamList.prototype.setBlock = function(v){ this._block = v; return this; };
	
	ParamList.prototype.at = function (index,force,name){
		if(force === undefined) force = false;
		if(name === undefined) name = null;
		if (force) {
			while (this.count() <= index){
				this.add(new Param(this.count() == index && name || ("_" + this.count())));
			};
			// need to visit at the same time, no?
		};
		return this.list()[index];
	};
	
	ParamList.prototype.visit = function (){
		this._splat = this.filter(function(par) {
			return par instanceof SplatParam;
		})[0];
		var blk = this.filter(function(par) {
			return par instanceof BlockParam;
		});
		
		if (blk.length > 1) {
			blk[1].warn("a method can only have one &block parameter");
		} else if (blk[0] && blk[0] != this.last()) {
			blk[0].warn("&block must be the last parameter of a method");
			// warn "&block must be the last parameter of a method", blk[0]
		};
		
		// add more warnings later(!)
		// should probably throw error as well to stop compilation
		
		// need to register the required-pars as variables
		return ParamList.__super__.visit.apply(this,arguments);
	};
	
	ParamList.prototype.js = function (o){
		if (this.count() == 0) { return EMPTY };
		if (o.parent() instanceof Block) { return this.head(o) };
		
		// items = map(|arg| arg.name.c ).compact
		// return null unless items[0]
		
		if (o.parent() instanceof Code) {
			// remove the splat, for sure.. need to handle the other items as well
			// this is messy with references to argvars etc etc. Fix
			var pars = this.nodes();
			// pars = filter(|arg| arg != @splat && !(arg isa BlockParam)) if @splat
			if (this._splat) { pars = this.filter(function(arg) {
				return (arg instanceof RequiredParam) || (arg instanceof OptionalParam);
			}) };
			return compact__(pars.map(function(arg) {
				return c__(arg.name());
			})).join(",");
		} else {
			throw "not implemented paramlist js";
			return "ta" + compact__(this.map(function(arg) {
				return arg.c();
			})).join(",");
		};
	};
	
	ParamList.prototype.head = function (o){
		var reg = [];
		var opt = [];
		var blk = null;
		var splat = null;
		var named = null;
		var arys = [];
		var signature = [];
		var idx = 0;
		
		this.nodes().forEach(function(par,i) {
			par.setIndex(idx);
			if (par instanceof NamedParams) {
				signature.push('named');
				named = par;
			} else if (par instanceof OptionalParam) {
				signature.push('opt');
				opt.push(par);
			} else if (par instanceof BlockParam) {
				signature.push('blk');
				blk = par;
			} else if (par instanceof SplatParam) {
				signature.push('splat');
				splat = par;
				idx -= 1; // this should really be removed from the list, no?
			} else if (par instanceof ArrayParams) {
				arys.push(par);
				signature.push('ary');
			} else {
				signature.push('reg');
				reg.push(par);
			};
			return idx++;
		});
		
		if (named) {
			var namedvar = named.variable();
		};
		
		// var opt = nodes.filter(|n| n isa OptionalParam)
		// var blk = nodes.filter(|n| n isa BlockParam)[0]
		// var splat = nodes.filter(|n| n isa SplatParam)[0]
		
		// simple situation where we simply switch
		// can probably optimize by not looking at arguments at all
		var ast = [];
		var isFunc = function(js) {
			return "typeof " + js + " == 'function'";
		};
		
		// This is broken when dealing with iframes anc XSS scripting
		// but for now it is the best test for actual arguments
		// can also do constructor.name == 'Object'
		var isObj = function(js) {
			return "" + js + ".constructor === Object";
		};
		var isntObj = function(js) {
			return "" + js + ".constructor !== Object";
		};
		// should handle some common cases in a cleaner (less verbose) manner
		// does this work with default params after optional ones? Is that even worth anything?
		// this only works in one direction now, unlike TupleAssign
		
		// we dont really check the length etc now -- so it is buggy for lots of arguments
		
		// if we have optional params in the regular order etc we can go the easy route
		// slightly hacky now. Should refactor all of these to use the signature?
		if (!named && !splat && !blk && opt.length > 0 && signature.join(" ").match(/opt$/)) {
			for (var i=0, len_=opt.length, par; i < len_; i++) {
				par = opt[i];ast.push(("if(" + (par.name().c()) + " === undefined) " + (par.name().c()) + " = " + (par.defaults().c())));
			};
		} else if (named && !splat && !blk && opt.length == 0) { // and no block?!
			// different shorthands
			// if named
			ast.push(("if(!" + (namedvar.c()) + "||" + (isntObj(namedvar.c())) + ") " + (namedvar.c()) + " = \{\}"));
		} else if (blk && opt.length == 1 && !splat && !named) {
			var op = opt[0];
			var opn = op.name().c();
			var bn = blk.name().c();
			ast.push(("if(" + bn + "==undefined && " + (isFunc(opn)) + ") " + bn + " = " + opn + "," + opn + " = " + (op.defaults().c())));
		} else if (blk && named && opt.length == 0 && !splat) {
			bn = blk.name().c();
			ast.push(("if(" + bn + "==undefined && " + (isFunc(namedvar.c())) + ") " + bn + " = " + (namedvar.c()) + "," + (namedvar.c()) + " = \{\}"));
			ast.push(("else if(!" + (namedvar.c()) + "||" + (isntObj(namedvar.c())) + ") " + (namedvar.c()) + " = \{\}"));
		} else if (opt.length > 0 || splat) { // && blk  # && !splat
			
			var argvar = this.scope__().temporary(this,{pool: 'arguments'}).predeclared().c();
			var len = this.scope__().temporary(this,{pool: 'counter'}).predeclared().c();
			
			var last = ("" + argvar + "[" + len + "-1]");
			var pop = ("" + argvar + "[--" + len + "]");
			ast.push(("var " + argvar + " = arguments, " + len + " = " + argvar + ".length"));
			
			if (blk) {
				bn = blk.name().c();
				if (splat) {
					ast.push(("var " + bn + " = " + (isFunc(last)) + " ? " + pop + " : null"));
				} else if (reg.length > 0) {
					// ast.push "// several regs really?"
					ast.push(("var " + bn + " = " + len + " > " + (reg.length) + " && " + (isFunc(last)) + " ? " + pop + " : null"));
				} else {
					ast.push(("var " + bn + " = " + (isFunc(last)) + " ? " + pop + " : null"));
				};
			};
			
			// if we have named params - look for them before splat
			// should probably loop through pars in the same order they were added
			// should it be prioritized above optional objects??
			if (named) {
				// should not include it when there is a splat?
				ast.push(("var " + (namedvar.c()) + " = " + last + "&&" + (isObj(last)) + " ? " + pop + " : \{\}"));
			};
			
			for (var i1=0, len_=opt.length, par1; i1 < len_; i1++) {
				par1 = opt[i1];ast.push(("if(" + len + " < " + (par1.index() + 1) + ") " + (par1.name().c()) + " = " + (par1.defaults().c())));
			};
			
			// add the splat
			if (splat) {
				var sn = splat.name().c();
				var si = splat.index();
				
				if (si == 0) {
					ast.push(("var " + sn + " = new Array(" + len + ">" + si + " ? " + len + " : 0)"));
					ast.push(("while(" + len + ">" + si + ") " + sn + "[" + len + "-1] = " + pop));
				} else {
					ast.push(("var " + sn + " = new Array(" + len + ">" + si + " ? " + len + "-" + si + " : 0)"));
					ast.push(("while(" + len + ">" + si + ") " + sn + "[--" + len + " - " + si + "] = " + argvar + "[" + len + "]"));
				};
			};
			
			// if named
			// 	for k,i in named.nodes
			// 		# OP('.',namedvar) <- this is the right way, with invalid names etc
			// 		var op = OP('.',namedvar,k.key).c
			// 		ast.push "var {k.key.c} = {op} !== undefined ? {op} : {k.value.c}"
			
			// if named
			
			// return ast.join(";\n") + ";"
			// return "if({opt[0].name.c} instanceof Function) {blk.c} = {opt[0].c};"
		} else if (opt.length > 0) {
			for (var i2=0, len_=opt.length, par2; i2 < len_; i2++) {
				par2 = opt[i2];ast.push(("if(" + (par2.name().c()) + " === undefined) " + (par2.name().c()) + " = " + (par2.defaults().c())));
			};
		};
		
		// now set stuff if named params(!)
		
		if (named) {
			for (var i3=0, ary=iter$(named.nodes()), len_=ary.length, k; i3 < len_; i3++) {
				// console.log "named var {k.c}"
				k = ary[i3];op = OP('.',namedvar,k.c()).c();
				ast.push(("var " + (k.c()) + " = " + op + " !== undefined ? " + op + " : " + (k.defaults().c())));
			};
		};
		
		if (arys.length) {
			for (var i4=0, len_=arys.length; i4 < len_; i4++) {
				// create tuples
				this.p("adding arrayparams");
				arys[i4].head(o,ast,this);
				// ast.push v.c
			};
		};
		
		
		
		// if opt:length == 0
		return ast.length > 0 ? ((ast.join(";\n") + ";")) : (EMPTY);
	};
	
	
	
	// Legacy. Should move away from this?
	function VariableDeclaration(){ ListNode.apply(this,arguments) };
	
	subclass$(VariableDeclaration,ListNode);
	exports.VariableDeclaration = VariableDeclaration; // export class 
	
	VariableDeclaration.prototype.__kind = {name: 'kind'};
	VariableDeclaration.prototype.kind = function(v){ return this._kind; }
	VariableDeclaration.prototype.setKind = function(v){ this._kind = v; return this; };
	
	// we want to register these variables in
	VariableDeclaration.prototype.add = function (name,init,pos){
		if(pos === undefined) pos = -1;
		var vardec = new VariableDeclarator(name,init);
		if (name instanceof Variable) { (vardec.setVariable(name),name) };
		pos == 0 ? (this.unshift(vardec)) : (this.push(vardec));
		return vardec;
		
		// TODO (target) << (node) rewrites to a caching push which returns node
	};
	
	// def remove item
	// 	if item isa Variable
	// 		map do |v,i|
	// 			if v.variable == item
	// 				p "found variable to remove"
	// 				super.remove(v)
	// 	else
	// 		super.remove(item)
	// 	self
	
	VariableDeclaration.prototype.load = function (list){
		// temporary solution!!!
		return list.map(function(par) {
			return new VariableDeclarator(par.name(),par.defaults(),par.splat());
		});
	};
	
	VariableDeclaration.prototype.isExpressable = function (){
		return this.nodes().every(function(item) {
			return item.isExpressable();
		});
	};
	
	VariableDeclaration.prototype.js = function (o){
		if (this.count() == 0) { return EMPTY };
		
		if (this.count() == 1 && !this.isExpressable()) {
			// p "SHOULD ALTER VARDEC!!!".cyan
			this.first().variable().autodeclare();
			var node = this.first().assignment();
			return node.c();
		};
		
		// FIX PERFORMANCE
		var out = compact__(cary__(this.nodes())).join(", ");
		return out ? (("var " + out)) : ("");
		// "var " + compact__(cary__(nodes)).join(", ") + ""
	};
	
	
	function VariableDeclarator(){ Param.apply(this,arguments) };
	
	subclass$(VariableDeclarator,Param);
	exports.VariableDeclarator = VariableDeclarator; // export class 
	VariableDeclarator.prototype.visit = function (){
		// even if we should traverse the defaults as if this variable does not exist
		// we need to preregister it and then activate it later
		var variable_, v_;
		(variable_=this.variable()) || ((this.setVariable(v_=this.scope__().register(this.name(),null)),v_));
		if (this.defaults()) { this.defaults().traverse() };
		// WARN what if it is already declared?
		this.variable().setDeclarator(this);
		this.variable().addReference(this.name());
		return this;
	};
	
	// needs to be linked up to the actual scoped variables, no?
	VariableDeclarator.prototype.js = function (o){
		if (this.variable()._proxy) { return null };
		
		var defs = this.defaults();
		// FIXME need to deal with var-defines within other statements etc
		// FIXME need better syntax for this
		if (defs != null && defs != undefined) {
			// console.log "defaults is {defaults}"
			if (defs instanceof Node) { defs = defs.c({expression: true}) };
			
			return "" + (this.variable().c()) + "=" + defs;
		} else {
			return "" + (this.variable().c());
		};
	};
	
	VariableDeclarator.prototype.accessor = function (){
		return this;
	};
	
	
	
	// TODO clean up and refactor all the different representations of vars
	// VarName, VarReference, LocalVarAccess?
	function VarName(a,b){
		VarName.__super__.constructor.apply(this,arguments);
		this._splat = b;
	};
	
	subclass$(VarName,ValueNode);
	exports.VarName = VarName; // export class 
	
	VarName.prototype.__variable = {name: 'variable'};
	VarName.prototype.variable = function(v){ return this._variable; }
	VarName.prototype.setVariable = function(v){ this._variable = v; return this; };
	
	VarName.prototype.__splat = {name: 'splat'};
	VarName.prototype.splat = function(v){ return this._splat; }
	VarName.prototype.setSplat = function(v){ this._splat = v; return this; };
	
	VarName.prototype.visit = function (){
		// p "visiting varname(!)", value.c
		// should we not lookup instead?
		var variable_, v_;
		(variable_=this.variable()) || ((this.setVariable(v_=this.scope__().register(this.value().c(),null)),v_));
		this.variable().setDeclarator(this);
		this.variable().addReference(this.value());
		return this;
	};
	
	VarName.prototype.js = function (o){
		return this.variable().c();
	};
	
	VarName.prototype.c = function (){
		return this.variable().c();
	};
	
	
	
	function VarList(t,l,r){
		this._traversed = false;
		this._type = this.type();
		this._left = l;
		this._right = r;
	};
	
	subclass$(VarList,Node);
	exports.VarList = VarList; // export class 
	
	VarList.prototype.__type = {name: 'type'};
	VarList.prototype.type = function(v){ return this._type; }
	VarList.prototype.setType = function(v){ this._type = v; return this; }; // let / var / const
	
	VarList.prototype.__left = {name: 'left'};
	VarList.prototype.left = function(v){ return this._left; }
	VarList.prototype.setLeft = function(v){ this._left = v; return this; };
	
	VarList.prototype.__right = {name: 'right'};
	VarList.prototype.right = function(v){ return this._right; }
	VarList.prototype.setRight = function(v){ this._right = v; return this; };
	
	// format :type, :left, :right
	
	// should throw error if there are more values on right than left
	
	VarList.prototype.visit = function (){
		
		// we need to carefully traverse children in the right order
		// since we should be able to reference
		var r;
		for (var i=0, ary=iter$(this.left()), len=ary.length; i < len; i++) {
			ary[i].traverse(); // this should really be a var-declaration
			if (r = this.right()[i]) { r.traverse() };
		};
		return this;
	};
	
	VarList.prototype.js = function (o){
		// for the regular items 
		var pairs = [];
		var ll = this.left().length;
		var rl = this.right().length;
		var v = null;
		
		// splatting here we come
		if (ll > 1 && rl == 1) {
			this.p("multiassign!");
			var r = this.right()[0];
			r.cache();
			for (var i=0, ary=iter$(this.left()), len=ary.length, l; i < len; i++) {
				l = ary[i];if (l.splat()) {
					throw "not supported?";
					this.p("splat"); // FIX reimplement slice?
					if (i == ll - 1) {
						v = this.util().slice(r,i);
						this.p("last");
					} else {
						v = this.util().slice(r,i,-(ll - i) + 1);
					};
				} else {
					v = OP('.',r,num__(i));
				};
				
				pairs.push(OP('=',l,v));
			};
		} else {
			for (var i1=0, ary=iter$(this.left()), len=ary.length, l1; i1 < len; i1++) {
				l1 = ary[i1];r = this.right()[i1];
				pairs.push(r ? (OP('=',l1.variable().accessor(),r)) : (l1));
			};
		};
		
		return ("var " + (pairs.c()));
	};
	
	
	
	// CODE
	
	function Code(){ Node.apply(this,arguments) };
	
	subclass$(Code,Node);
	exports.Code = Code; // export class 
	
	Code.prototype.__head = {name: 'head'};
	Code.prototype.head = function(v){ return this._head; }
	Code.prototype.setHead = function(v){ this._head = v; return this; };
	
	Code.prototype.__body = {name: 'body'};
	Code.prototype.body = function(v){ return this._body; }
	Code.prototype.setBody = function(v){ this._body = v; return this; };
	
	Code.prototype.__scope = {name: 'scope'};
	Code.prototype.scope = function(v){ return this._scope; }
	Code.prototype.setScope = function(v){ this._scope = v; return this; };
	
	Code.prototype.__params = {name: 'params'};
	Code.prototype.params = function(v){ return this._params; }
	Code.prototype.setParams = function(v){ this._params = v; return this; };
	
	Code.prototype.scopetype = function (){
		return Scope;
	};
	
	Code.prototype.visit = function (){
		if (this._scope) { this._scope.visit() };
		// @scope.parent = STACK.scope(1) if @scope
		return this;
	};
	
	
	// Rename to Program?
	function Root(body,opts){
		// p "create root!"
		this._traversed = false;
		this._body = blk__(body);
		this._scope = new FileScope(this,null);
		this._options = {};
	};
	
	subclass$(Root,Code);
	exports.Root = Root; // export class 
	Root.prototype.visit = function (){
		this.scope().visit();
		return this.body().traverse();
	};
	
	Root.prototype.compile = function (o){
		STACK.reset(); // -- nested compilation does not work now
		STACK._options = o;
		this._options = o || {};
		OPTS = o;
		
		this.traverse();
		var out = this.c();
		return out;
	};
	
	Root.prototype.js = function (o){
		if (this._options.bare) {
			return this.scope().c();
		} else {
			return '(function(){\n\n' + this.scope().c({indent: true}) + '\n\n}())';
		};
	};
	
	
	Root.prototype.analyze = function (pars){
		if(!pars||pars.constructor !== Object) pars = {};
		var loglevel = pars.loglevel !== undefined ? pars.loglevel : 0;
		STACK.setLoglevel(loglevel);
		STACK._analyzing = true;
		this.traverse();
		STACK._analyzing = false;
		return this.scope().dump();
	};
	
	Root.prototype.inspect = function (){
		return true;
	};
	
	
	function ClassDeclaration(name,superclass,body){
		// what about the namespace?
		this._traversed = false;
		this._name = name;
		this._superclass = superclass;
		this._scope = new ClassScope(this);
		this._body = blk__(body);
		this;
	};
	
	subclass$(ClassDeclaration,Code);
	exports.ClassDeclaration = ClassDeclaration; // export class 
	
	ClassDeclaration.prototype.__name = {name: 'name'};
	ClassDeclaration.prototype.name = function(v){ return this._name; }
	ClassDeclaration.prototype.setName = function(v){ this._name = v; return this; };
	
	ClassDeclaration.prototype.__superclass = {name: 'superclass'};
	ClassDeclaration.prototype.superclass = function(v){ return this._superclass; }
	ClassDeclaration.prototype.setSuperclass = function(v){ this._superclass = v; return this; };
	
	ClassDeclaration.prototype.__initor = {name: 'initor'};
	ClassDeclaration.prototype.initor = function(v){ return this._initor; }
	ClassDeclaration.prototype.setInitor = function(v){ this._initor = v; return this; };
	
	ClassDeclaration.prototype.visit = function (){
		// replace with some advanced lookup?
		this.scope().visit();
		this.body().traverse();
		return this;
	};
	
	ClassDeclaration.prototype.js = function (o){
		this.scope().virtualize(); // is this always needed?
		this.scope().context().setValue(this.name());
		
		// should probably also warn about stuff etc
		if (this.option('extension')) {
			return this.body().c();
		};
		
		var head = [];
		var o = this._options || {};
		var cname = this.name() instanceof Access ? (this.name().right()) : (this.name());
		var namespaced = this.name() != cname;
		var initor = null;
		var sup = this.superclass();
		
		var bodyindex = -1;
		var spaces = this.body().filter(function(item) {
			return item instanceof Terminator;
		});
		
		this.body().map(function(c,i) {
			if ((c instanceof MethodDeclaration) && c.type() == 'constructor') {
				return bodyindex = i;
			};
		});
		
		if (bodyindex >= 0) {
			initor = this.body().removeAt(bodyindex);
		};
		
		// var initor = body.pluck do |c| c isa MethodDeclaration && c.type == :constructor
		// compile the cname
		if (typeof cname != 'string') { cname = cname.c() };
		
		var cpath = typeof this.name() == 'string' ? (this.name()) : (this.name().c());
		
		if (!initor) {
			if (sup) {
				initor = ("function " + cname + "()\{ " + (sup.c()) + ".apply(this,arguments) \};\n\n");
			} else {
				initor = ("function " + cname + "()") + '{ };\n\n';
			};
		} else {
			initor.setName(cname);
			initor = initor.c() + ';';
		};
		
		// if we are defining a class inside a namespace etc -- how should we set up the class?
		
		if (namespaced) {
			// should use Nodes to build this instead
			initor = ("" + cpath + " = " + initor); // OP('=',name,initor)
		};
		
		head.push(initor); // // @class {cname}\n
		
		if (bodyindex >= 0) {
			// add the space after initor?
			if (this.body().index(bodyindex) instanceof Terminator) {
				head.push(this.body().removeAt(bodyindex));
			};
		} else {
			// head.push(Terminator.new('\n\n'))
			true;
		};
		
		
		
		if (sup) {
			// console.log "deal with superclass!"
			// head.push("// extending the superclass\nimba$class({name.c},{sup.c});\n\n")
			head.push(new Util.Subclass([this.name(),sup]));
		};
		
		// only if it is not namespaced
		if (o.global && !namespaced) { // option(:global)
			head.push(("global." + cname + " = " + cpath + "; // global class \n"))
		};
		
		if (o.export && !namespaced) {
			head.push(("exports." + cname + " = " + cpath + "; // export class \n"))
		};
		
		// FIXME
		// if namespaced and (o:local or o:export)
		// 	console.log "namespaced classes are implicitly local/global depending on the namespace"
		
		
		for (var i=0, ary=iter$(head.reverse()), len=ary.length; i < len; i++) {
			this.body().unshift(ary[i]);
		};
		this.body()._indentation = null;
		var out = this.body().c();
		
		return out;
	};
	
	
	
	function TagDeclaration(name,superclass,body){
		// what about the namespace?
		// @name = TagTypeRef.new(name)
		this._traversed = false;
		this._name = name;
		this._superclass = superclass;
		this._scope = new TagScope(this);
		this._body = blk__(body || []);
	};
	
	subclass$(TagDeclaration,Code);
	exports.TagDeclaration = TagDeclaration; // export class 
	
	TagDeclaration.prototype.__name = {name: 'name'};
	TagDeclaration.prototype.name = function(v){ return this._name; }
	TagDeclaration.prototype.setName = function(v){ this._name = v; return this; };
	
	TagDeclaration.prototype.__superclass = {name: 'superclass'};
	TagDeclaration.prototype.superclass = function(v){ return this._superclass; }
	TagDeclaration.prototype.setSuperclass = function(v){ this._superclass = v; return this; };
	
	TagDeclaration.prototype.__initor = {name: 'initor'};
	TagDeclaration.prototype.initor = function(v){ return this._initor; }
	TagDeclaration.prototype.setInitor = function(v){ this._initor = v; return this; };
	
	TagDeclaration.prototype.visit = function (){
		// replace with some advanced lookup?
		this.scope().visit();
		return this.body().traverse();
	};
	
	TagDeclaration.prototype.id = function (){
		return this.name().id();
	};
	
	TagDeclaration.prototype.js = function (o){
		
		if (this.option('extension')) {
			// check if we have an initialize etc - not allowed?
			this.scope().context().setValue(this.name());
			return this.body().c();
		} else {
			// context should come from the body, no?
			this._ctx = this.scope().declare('tag',null,{system: true});
			this.scope().context().setValue(this._ctx);
		};
		
		
		// should disallow initialize for tags?
		var sup = this.superclass() && "," + helpers.singlequote(this.superclass().func()) || "";
		var ctor = ""; // ",function {name.func}(d)\{this.setDom(d)\}"
		var cbody = this.body().c();
		var outbody = this.body().count() ? ((", function(" + (this._ctx.c()) + ")\{" + cbody + "\}")) : ('');
		
		var out = this.name().id() ? (
			("Imba.defineSingletonTag('" + (this.name().id()) + "'" + ctor + sup + outbody + ")")
		) : (
			("Imba.defineTag('" + (this.name().func()) + "'" + ctor + sup + outbody + ")")
		);
		
		return out;
		
		// if the body is empty we can return this directly
		// console.log "here"
		if (this.body().count() == 0) {
			return out;
		};
		
		// create closure etc
		// again, we should really use the included system
		// FIXME should consolidate the way we generate all code - this
		// is going down a route of more direct conversion, which is less
		// flexible.
		
		// WARN should fix
		this.body()._indentation = null;
		
		out = ("var tag = " + out + ";");
		// scope.context.value = Const.new('tag')
		out += ("\n" + (this.body().c()));
		
		return '(function()' + helpers.bracketize(out,true) + ')()';
	};
	
	
	function Func(params,body,name,target,o){
		// p "INIT Function!!",params,body,name
		var typ = this.scopetype();
		this._traversed = false;
		this._body = blk__(body);
		this._scope || (this._scope = (o && o.scope) || new typ(this));
		this._scope.setParams(this._params = new ParamList(params));
		this._name = name || '';
		this._target = target;
		this._options = o;
		this._type = 'function';
		this._variable = null;
		this;
	};
	
	subclass$(Func,Code);
	exports.Func = Func; // export class 
	
	Func.prototype.__name = {name: 'name'};
	Func.prototype.name = function(v){ return this._name; }
	Func.prototype.setName = function(v){ this._name = v; return this; };
	
	Func.prototype.__params = {name: 'params'};
	Func.prototype.params = function(v){ return this._params; }
	Func.prototype.setParams = function(v){ this._params = v; return this; };
	
	Func.prototype.__target = {name: 'target'};
	Func.prototype.target = function(v){ return this._target; }
	Func.prototype.setTarget = function(v){ this._target = v; return this; };
	
	Func.prototype.__options = {name: 'options'};
	Func.prototype.options = function(v){ return this._options; }
	Func.prototype.setOptions = function(v){ this._options = v; return this; };
	
	Func.prototype.__type = {name: 'type'};
	Func.prototype.type = function(v){ return this._type; }
	Func.prototype.setType = function(v){ this._type = v; return this; };
	
	Func.prototype.__context = {name: 'context'};
	Func.prototype.context = function(v){ return this._context; }
	Func.prototype.setContext = function(v){ this._context = v; return this; };
	
	Func.prototype.scopetype = function (){
		return FunctionScope;
	};
	
	Func.prototype.visit = function (){
		this.scope().visit();
		this._context = this.scope().parent();
		this._params.traverse();
		return this._body.traverse(); // so soon?
	};
	
	
	Func.prototype.js = function (o){
		if (!this.option('noreturn')) { this.body().consume(new ImplicitReturn()) };
		var code = this.scope().c({indent: true,braces: true});
		// args = params.map do |par| par.name
		// head = params.map do |par| par.c
		// code = [head,body.c(expression: no)].flatten__.compact.join("\n").wrap
		// FIXME creating the function-name this way is prone to create naming-collisions
		// will need to wrap the value in a FunctionName which takes care of looking up scope
		// and possibly dealing with it
		var name = typeof this._name == 'string' ? (this._name) : (this._name.c());
		name = name ? (' ' + name.replace(/\./g,'_')) : ('');
		var out = ("function" + name + "(" + (this.params().c()) + ") ") + code;
		if (this.option('eval')) { out = ("(" + out + ")()") };
		return out;
	};
	
	Func.prototype.shouldParenthesize = function (){
		return (this.up() instanceof Call) && this.up().callee() == this;
		// if up as a call? Only if we are 
	};
	
	
	function Lambda(){ Func.apply(this,arguments) };
	
	subclass$(Lambda,Func);
	exports.Lambda = Lambda; // export class 
	Lambda.prototype.scopetype = function (){
		return LambdaScope;
	};
	
	
	function TagFragmentFunc(){ Func.apply(this,arguments) };
	
	subclass$(TagFragmentFunc,Func);
	exports.TagFragmentFunc = TagFragmentFunc; // export class 
	
	
	// MethodDeclaration
	// Create a shared body?
	
	function MethodDeclaration(){ Func.apply(this,arguments) };
	
	subclass$(MethodDeclaration,Func);
	exports.MethodDeclaration = MethodDeclaration; // export class 
	
	MethodDeclaration.prototype.__variable = {name: 'variable'};
	MethodDeclaration.prototype.variable = function(v){ return this._variable; }
	MethodDeclaration.prototype.setVariable = function(v){ this._variable = v; return this; };
	
	MethodDeclaration.prototype.scopetype = function (){
		return MethodScope;
	};
	
	MethodDeclaration.prototype.visit = function (){
		// prebreak # make sure this has a break?
		this.scope().visit();
		
		if (String(this.name()) == 'initialize') {
			this.setType('constructor');
		};
		
		if (this.option('greedy')) {
			// set(greedy: true)
			// p "BODY EXPRESSIONS!! This is a fragment"
			var tree = new TagTree();
			this._body = this.body().consume(tree);
			// body.nodes = [Arr.new(body.nodes)]
		};
		
		
		this._context = this.scope().parent().closure();
		this._params.traverse();
		
		if (this.target() instanceof Self) {
			this._target = this._context.context();
			this.set({static: true});
		};
		
		if (this.context() instanceof ClassScope) {
			// register as class-method?
			// should register for this
			// console.log "context is classscope {@name}"
			true;
		} else if (!(this._target)) {
			this._variable = this.context().register(this.name(),this,{type: 'meth'});
		};
		this._target || (this._target = this._scope.parent().context());
		
		this._body.traverse(); // so soon?
		
		// p "method target {@target} {@context}"
		return this;
	};
	
	MethodDeclaration.prototype.supername = function (){
		return this.type() == 'constructor' ? (this.type()) : (this.name());
	};
	
	
	// FIXME export global etc are NOT valid for methods inside any other scope than
	// the outermost scope (root)
	
	MethodDeclaration.prototype.js = function (o){
		// FIXME Do this in the grammar - remnants of old implementation
		if (!(this.type() == 'constructor' || this.option('noreturn'))) {
			if (this.option('greedy')) {
				// haaack
				this.body().consume(new GreedyReturn());
			} else {
				this.body().consume(new ImplicitReturn());
			};
		};
		var code = this.scope().c({indent: true,braces: true});
		
		// same for Func -- should generalize
		var name = typeof this._name == 'string' ? (this._name) : (this._name.c());
		name = name.replace(/\./g,'_');
		
		// var name = self.name.c.replace(/\./g,'_') # WHAT?
		var foot = [];
		
		var left = "";
		var func = ("(" + (this.params().c()) + ")") + code; // .wrap
		var target = this.target();
		var decl = !this.option('global') && !this.option('export');
		
		if (target instanceof ScopeContext) {
			// the target is a scope context
			target = null;
		};
		
		var ctx = this.context();
		var out = "";
		// if ctx 
		
		
		
		var fname = sym__(this.name());
		// console.log "symbolize {self.name} -- {fname}"
		var fdecl = fname; // decl ? fname : ''
		
		if ((ctx instanceof ClassScope) && !target) {
			if (this.type() == 'constructor') {
				out = ("function " + fname + func);
			} else if (this.option('static')) {
				out = ("" + (ctx.context().c()) + "." + fname + " = function " + func);
			} else {
				out = ("" + (ctx.context().c()) + ".prototype." + fname + " = function " + func);
			};
		} else if ((ctx instanceof FileScope) && !target) {
			// register method as a root-function, but with auto-call? hmm
			// should probably set using variable directly instead, no?
			out = ("function " + fdecl + func);
		} else if (target && this.option('static')) {
			out = ("" + (target.c()) + "." + fname + " = function " + func);
		} else if (target) {
			out = ("" + (target.c()) + ".prototype." + fname + " = function " + func);
		} else {
			out = ("function " + fdecl + func);
		};
		
		if (this.option('global')) {
			out = ("" + fname + " = " + out);
		};
		
		if (this.option('export')) {
			out = ("" + out + "; exports." + fname + " = " + fname + ";");
		};
		
		return out;
	};
	
	
	
	function TagFragmentDeclaration(){ MethodDeclaration.apply(this,arguments) };
	
	subclass$(TagFragmentDeclaration,MethodDeclaration);
	exports.TagFragmentDeclaration = TagFragmentDeclaration; // export class 
	
	
	
	var propTemplate = '${headers}\n${path}.__${getter} = ${options};\n${path}.${getter} = function(v){ return ${get}; }\n${path}.${setter} = function(v){ ${set}; return this; }\n${init}';
	
	var propWatchTemplate = '${headers}\n${path}.__${getter} = ${options};\n${path}.${getter} = function(v){ return ${get}; }\n${path}.${setter} = function(v){\n	var a = this.${getter}();\n	if(v != a) { v = ${set}; }\n	if(v != a) { ${ondirty} }\n	return this;\n}\n${init}';
	
	function PropertyDeclaration(name,options,token){
		this._token = token;
		this._traversed = false;
		this._name = name;
		this._options = options || new Obj(new AssignList());
	};
	
	subclass$(PropertyDeclaration,Node);
	exports.PropertyDeclaration = PropertyDeclaration; // export class 
	
	PropertyDeclaration.prototype.__name = {name: 'name'};
	PropertyDeclaration.prototype.name = function(v){ return this._name; }
	PropertyDeclaration.prototype.setName = function(v){ this._name = v; return this; };
	
	PropertyDeclaration.prototype.__options = {name: 'options'};
	PropertyDeclaration.prototype.options = function(v){ return this._options; }
	PropertyDeclaration.prototype.setOptions = function(v){ this._options = v; return this; };
	
	PropertyDeclaration.prototype.visit = function (){
		this._options.traverse();
		return this;
	};
	
	// This will soon support bindings / listeners etc, much more
	// advanced generated code based on options passed in.
	PropertyDeclaration.prototype.c = function (){
		var o = this.options();
		var ast = "";
		var key = this.name().c();
		var gets = ("@" + key);
		var sets = ("@" + key + " = v");
		var scope = STACK.scope();
		
		var deflt = this.options().key('default');
		var init = deflt ? (("self:prototype.@" + key + " = " + (deflt.value().c()))) : ("");
		
		// var pars =
		// 	watch: o.key(:watch)
		// 	delegate: o.key(:delegate)
		
		var pars = o.hash();
		
		var isAttr = (this._token && String(this._token) == 'attr') || o.key('attr');
		
		var js = {
			key: key,
			getter: key,
			setter: sym__(("set-" + key)),
			scope: ("" + (scope.context().c())),
			path: '${scope}.prototype',
			set: ("this._" + key + " = v"),
			get: ("this._" + key),
			init: "",
			headers: "",
			ondirty: ""
		};
		
		var tpl = propTemplate;
		
		o.add('name',new Symbol(key));
		
		if (pars.watch) {
			// p "watch is a property {pars:watch}"
			if (!((pars.watch instanceof Bool) && !(pars.watch.truthy()))) { tpl = propWatchTemplate };
			var wfn = ("" + key + "DidSet");
			
			if (pars.watch instanceof Symbol) {
				wfn = pars.watch;
			} else if (pars.watch instanceof Bool) {
				o.key('watch').setValue(new Symbol(("" + key + "DidSet")));
			};
			
			// should check for the function first, no?
			// HACK
			// o.key(:watch).value = Symbol
			var fn = OP('.',new This(),wfn);
			js.ondirty = OP('&&',fn,CALL(fn,['v','a',("this.__" + key)])).c(); // CALLSELF(wfn,[]).c
			// js:ondirty = "if(this.{wfn}) this.{wfn}(v,a,this.__{key});"
		};
		
		if (pars.observe) {
			if (pars.observe instanceof Bool) {
				o.key('observe').setValue(new Symbol(("" + key + "DidEmit")));
			};
			
			tpl = propWatchTemplate;
			js.ondirty = ("Imba.observeProperty(this,'" + key + "'," + (o.key('observe').value().c()) + ",v,a);") + (js.ondirty || '');
			// OP('&&',fn,CALL(fn,['v','a',"this.__{key}"])).c
		};
		
		if ((this._token && String(this._token) == 'attr') || o.key('dom') || o.key('attr')) {
			// need to make sure o has a key for attr then - so that the delegate can know?
			js.set = ("this.setAttribute('" + key + "',v)");
			js.get = ("this.getAttribute('" + key + "')");
		} else if (o.key('delegate')) {
			// if we have a delegate
			js.set = ("this.__" + key + ".delegate.set(this,'" + key + "',v,this.__" + key + ")");
			js.get = ("this.__" + key + ".delegate.get(this,'" + key + "',this.__" + key + ")");
		};
		
		
		
		if (deflt) {
			// add better default-support here - go through class-method setAttribute instead
			if (o.key('dom')) {
				js.init = ("" + (js.scope) + ".dom().setAttribute('" + key + "'," + (deflt.value().c()) + ");");
			} else {
				js.init = ("" + (js.scope) + ".prototype._" + key + " = " + (deflt.value().c()) + ";");
			};
		};
		
		if (o.key('chainable')) {
			js.get = ("v !== undefined ? (this." + (js.setter) + "(v),this) : " + (js.get));
		};
		
		js.options = o.c();
		
		var reg = /\$\{(\w+)\}/gm;
		// var tpl = o.key(:watch) ? propWatchTemplate : propTemplate
		var out = tpl.replace(reg,function(m,a) {
			return js[a];
		});
		// run another time for nesting. hacky
		out = out.replace(reg,function(m,a) {
			return js[a];
		});
		out = out.replace(/\n\s*$/,'');
		
		// if o.key(:v)
		return out;
	};
	
	
	
	
	// Literals should probably not inherit from the same parent
	// as arrays, tuples, objects would be better off inheriting
	// from listnode.
	
	function Literal(v){
		this._traversed = false;
		this._expression = true;
		this._cache = null;
		this._raw = null;
		this._value = v;
	};
	
	subclass$(Literal,ValueNode);
	exports.Literal = Literal; // export class 
	Literal.prototype.toString = function (){
		return "" + this.value();
	};
	
	Literal.prototype.hasSideEffects = function (){
		return false;
	};
	
	
	
	function Bool(v){
		this._value = v;
		this._raw = String(v) == "true" ? (true) : (false);
	};
	
	subclass$(Bool,Literal);
	exports.Bool = Bool; // export class 
	Bool.prototype.cache = function (){
		return this;
	};
	
	Bool.prototype.truthy = function (){
		// p "bool is truthy? {value}"
		return String(this.value()) == "true";
		// yes
	};
	
	Bool.prototype.js = function (o){
		return String(this._value);
	};
	
	Bool.prototype.c = function (){
		STACK._counter += 1;
		// undefined should not be a bool
		return String(this._value);
		// @raw ? "true" : "false"
	};
	
	
	function Undefined(){ Literal.apply(this,arguments) };
	
	subclass$(Undefined,Literal);
	exports.Undefined = Undefined; // export class 
	Undefined.prototype.c = function (){
		return "undefined";
	};
	
	
	function Nil(){ Literal.apply(this,arguments) };
	
	subclass$(Nil,Literal);
	exports.Nil = Nil; // export class 
	Nil.prototype.c = function (){
		return "null";
	};
	
	
	function True(){ Bool.apply(this,arguments) };
	
	subclass$(True,Bool);
	exports.True = True; // export class 
	True.prototype.raw = function (){
		return true;
	};
	
	True.prototype.c = function (){
		return "true";
	};
	
	
	function False(){ Bool.apply(this,arguments) };
	
	subclass$(False,Bool);
	exports.False = False; // export class 
	False.prototype.raw = function (){
		return false;
	};
	
	False.prototype.c = function (){
		return "false";
	};
	
	
	function Num(v){
		this._traversed = false;
		this._value = v;
	};
	
	subclass$(Num,Literal);
	exports.Num = Num; // export class 
	Num.prototype.toString = function (){
		return String(this._value);
	};
	
	Num.prototype.shouldParenthesize = function (){
		var par = this.up();
		return (par instanceof Access) && par.left() == this;
	};
	
	Num.prototype.js = function (o){
		var num = String(this._value);
		// console.log "compiled num to {num}"
		return num;
	};
	
	Num.prototype.c = function (o){
		if (this._cache) { return Num.__super__.c.call(this,o) };
		var js = String(this._value);
		var par = STACK.current();
		var paren = (par instanceof Access) && par.left() == this;
		// only if this is the right part of teh acces
		// console.log "should paren?? {shouldParenthesize}"
		return paren ? ("(" + js + ")") : (js);
		// @cache ? super(o) : String(@value)
	};
	
	Num.prototype.cache = function (o){
		// p "cache num",o
		if (!(o && (o.cache || o.pool))) { return this };
		return Num.__super__.cache.call(this,o);
	};
	
	Num.prototype.raw = function (){
		// really?
		return JSON.parse(String(this.value()));
	};
	
	
	// should be quoted no?
	// what about strings in object-literals?
	// we want to be able to see if the values are allowed
	function Str(v){
		this._traversed = false;
		this._expression = true;
		this._cache = null;
		this._value = v;
		// should grab the actual value immediately?
	};
	
	subclass$(Str,Literal);
	exports.Str = Str; // export class 
	Str.prototype.raw = function (){
		// JSON.parse requires double-quoted strings,
		// while eval also allows single quotes. 
		// NEXT eval is not accessible like this
		// WARNING TODO be careful! - should clean up
		
		return this._raw || (this._raw = String(this.value()).slice(1,-1)); // incredibly stupid solution
	};
	
	Str.prototype.isValidIdentifier = function (){
		// there are also some values we cannot use
		return this.raw().match(/^[a-zA-Z\$\_]+[\d\w\$\_]*$/) ? (true) : (false);
	};
	
	Str.prototype.js = function (o){
		return String(this._value);
	};
	
	Str.prototype.c = function (o){
		return this._cache ? (Str.__super__.c.call(this,o)) : (String(this._value));
	};
	
	
	// Currently not used - it would be better to use this
	// for real interpolated strings though, than to break
	// them up into their parts before parsing
	function InterpolatedString(){ ListNode.apply(this,arguments) };
	
	subclass$(InterpolatedString,ListNode);
	exports.InterpolatedString = InterpolatedString; // export class 
	InterpolatedString.prototype.js = function (o){
		return "interpolated string";
	};
	
	
	
	function Tuple(){ ListNode.apply(this,arguments) };
	
	subclass$(Tuple,ListNode);
	exports.Tuple = Tuple; // export class 
	Tuple.prototype.c = function (){
		// compiles as an array
		return new Arr(this.nodes()).c();
	};
	
	Tuple.prototype.hasSplat = function (){
		return this.filter(function(v) {
			return v instanceof Splat;
		})[0];
	};
	
	Tuple.prototype.consume = function (node){
		if (this.count() == 1) {
			return this.first().consume(node);
		} else {
			throw "multituple cannot consume";
		};
	};
	
	
	
	// Because we've dropped the Str-wrapper it is kinda difficult
	function Symbol(){ Literal.apply(this,arguments) };
	
	subclass$(Symbol,Literal);
	exports.Symbol = Symbol; // export class 
	Symbol.prototype.isValidIdentifier = function (){
		return this.raw().match(/^[a-zA-Z\$\_]+[\d\w\$\_]*$/) ? (true) : (false);
	};
	
	Symbol.prototype.raw = function (){
		return this._raw || (this._raw = sym__(this.value()));
	};
	
	Symbol.prototype.js = function (o){
		return "'" + (sym__(this.value())) + "'";
	};
	
	
	function RegExp(){ Literal.apply(this,arguments) };
	
	subclass$(RegExp,Literal);
	exports.RegExp = RegExp; // export class 
	
	
	// Should inherit from ListNode - would simplify
	function Arr(){ Literal.apply(this,arguments) };
	
	subclass$(Arr,Literal);
	exports.Arr = Arr; // export class 
	Arr.prototype.load = function (value){
		return value instanceof Array ? (new ArgList(value)) : (value);
	};
	
	Arr.prototype.push = function (item){
		this.value().push(item);
		return this;
	};
	
	Arr.prototype.count = function (){
		return this.value().length;
	};
	
	Arr.prototype.nodes = function (){
		var val = this.value();
		return val instanceof Array ? (val) : (val.nodes());
	};
	
	Arr.prototype.splat = function (){
		return this.value().some(function(v) {
			return v instanceof Splat;
		});
	};
	
	Arr.prototype.visit = function (){
		if (this._value && this._value.traverse) { this._value.traverse() };
		return this;
	};
	
	Arr.prototype.js = function (o){
		
		var val = this._value;
		if (!val) { return "[]" };
		
		var splat = this.splat();
		var nodes = val instanceof Array ? (val) : (val.nodes());
		// p "value of array isa {@value}"
		
		// for v in @value
		// 	break splat = yes if v isa Splat
		// var splat = value.some(|v| v isa Splat)
		
		if (splat) {
			// "SPLATTED ARRAY!"
			// if we know for certain that the splats are arrays we can drop the slice?
			// p "array is splat?!?"
			var slices = [];
			var group = null;
			
			for (var i=0, ary=iter$(nodes), len=ary.length, v; i < len; i++) {
				v = ary[i];if (v instanceof Splat) {
					slices.push(v);
					group = null;
				} else {
					if (!group) { slices.push(group = new Arr([])) };
					group.push(v);
				};
			};
			
			return "[].concat(" + (cary__(slices).join(", ")) + ")";
		} else {
			// very temporary. need a more generic way to prettify code
			// should depend on the length of the inner items etc
			// if @indented or option(:indent) or value.@indented
			//	"[\n{value.c.join(",\n").indent}\n]"
			var out = val instanceof Array ? (cary__(val)) : (val.c());
			return "[" + out + "]";
		};
	};
	
	Arr.prototype.hasSideEffects = function (){
		return this.value().some(function(v) {
			return v.hasSideEffects();
		});
	};
	
	Arr.prototype.toString = function (){
		return "Arr";
	};
	
	
	Arr.wrap = function (val){
		return new Arr(val);
	};
	
	
	// should not be cklassified as a literal?
	function Obj(){ Literal.apply(this,arguments) };
	
	subclass$(Obj,Literal);
	exports.Obj = Obj; // export class 
	Obj.prototype.load = function (value){
		return value instanceof Array ? (new AssignList(value)) : (value);
	};
	
	Obj.prototype.visit = function (){
		if (this._value) { this._value.traverse() };
		// for v in value
		// 	v.traverse
		return this;
	};
	
	Obj.prototype.js = function (o){
		var dyn = this.value().filter(function(v) {
			return (v instanceof ObjAttr) && (v.key() instanceof Op);
		});
		
		if (dyn.length > 0) {
			var idx = this.value().indexOf(dyn[0]);
			// p "dynamic keys! {dyn}"
			// create a temp variable
			
			var tmp = this.scope__().temporary(this);
			// set the temporary object to the same
			var first = this.value().slice(0,idx);
			var obj = new Obj(first);
			var ast = [OP('=',tmp,obj)];
			
			this.value().slice(idx).forEach(function(atr) {
				return ast.push(OP('=',OP('.',tmp,atr.key()),atr.value()));
			});
			ast.push(tmp); // access the tmp at in the last part
			return new Parens(ast).c();
		};
		
		// for objects with expression-keys we need to think differently
		return '{' + this.value().c() + '}';
	};
	
	Obj.prototype.add = function (k,v){
		if ((typeof k=='string'||k instanceof String)) { k = new Identifier(k) };
		var kv = new ObjAttr(k,v);
		this.value().push(kv);
		return kv;
	};
	
	Obj.prototype.hash = function (){
		var hash = {};
		for (var i=0, ary=iter$(this.value()), len=ary.length, k; i < len; i++) {
			k = ary[i];if (k instanceof ObjAttr) { hash[k.key().symbol()] = k.value() };
		};
		return hash;
		// return k if k.key.symbol == key
	};
	
	// add method for finding properties etc?
	Obj.prototype.key = function (key){
		for (var i=0, ary=iter$(this.value()), len=ary.length, k; i < len; i++) {
			k = ary[i];if ((k instanceof ObjAttr) && k.key().symbol() == key) { return k };
		};
		return null;
	};
	
	Obj.prototype.indented = function (a,b){
		this._value.indented(a,b);
		return this;
	};
	
	Obj.prototype.hasSideEffects = function (){
		return this.value().some(function(v) {
			return v.hasSideEffects();
		});
	};
	
	// for converting a real object into an ast-representation
	Obj.wrap = function (obj){
		var attrs = [];
		for (var v, i=0, keys=Object.keys(obj), l=keys.length; i < l; i++){
			v = obj[keys[i]];if (v instanceof Array) {
				v = Arr.wrap(v);
			} else if (v.constructor == Object) {
				v = Obj.wrap(v);
			};
			attrs.push(new ObjAttr(keys[i],v));
		};
		return new Obj(attrs);
	};
	
	Obj.prototype.toString = function (){
		return "Obj";
	};
	
	
	function ObjAttr(key,value){
		this._traversed = false;
		this._key = key;
		this._value = value;
		this._dynamic = (key instanceof Op);
		this;
	};
	
	subclass$(ObjAttr,Node);
	exports.ObjAttr = ObjAttr; // export class 
	
	ObjAttr.prototype.__key = {name: 'key'};
	ObjAttr.prototype.key = function(v){ return this._key; }
	ObjAttr.prototype.setKey = function(v){ this._key = v; return this; };
	
	ObjAttr.prototype.__value = {name: 'value'};
	ObjAttr.prototype.value = function(v){ return this._value; }
	ObjAttr.prototype.setValue = function(v){ this._value = v; return this; };
	
	ObjAttr.prototype.__options = {name: 'options'};
	ObjAttr.prototype.options = function(v){ return this._options; }
	ObjAttr.prototype.setOptions = function(v){ this._options = v; return this; };
	
	ObjAttr.prototype.visit = function (){
		// should probably traverse key as well, unless it is a dead simple identifier
		this.key().traverse();
		return this.value().traverse();
	};
	
	ObjAttr.prototype.js = function (o){
		return "" + (this.key().c()) + ": " + (this.value().c());
	};
	
	ObjAttr.prototype.hasSideEffects = function (){
		return true;
	};
	
	
	
	
	function ArgsReference(){ Node.apply(this,arguments) };
	
	subclass$(ArgsReference,Node);
	exports.ArgsReference = ArgsReference; // export class 
	ArgsReference.prototype.c = function (){
		return "arguments";
	};
	
	
	// should be a separate Context or something
	function Self(scope){
		this._scope = scope;
	};
	
	subclass$(Self,Literal);
	exports.Self = Self; // export class 
	
	Self.prototype.__scope = {name: 'scope'};
	Self.prototype.scope = function(v){ return this._scope; }
	Self.prototype.setScope = function(v){ this._scope = v; return this; };
	
	Self.prototype.cache = function (){
		return this;
	};
	
	Self.prototype.reference = function (){
		return this;
	};
	
	Self.prototype.c = function (){
		var s = this.scope__();
		return s ? (s.context().c()) : ("this");
	};
	
	
	function ImplicitSelf(){ Self.apply(this,arguments) };
	
	subclass$(ImplicitSelf,Self);
	exports.ImplicitSelf = ImplicitSelf; // export class 
	
	
	function This(){ Self.apply(this,arguments) };
	
	subclass$(This,Self);
	exports.This = This; // export class 
	This.prototype.cache = function (){
		return this;
	};
	
	This.prototype.reference = function (){
		// p "referencing this"
		return this;
	};
	
	This.prototype.c = function (){
		return "this";
	};
	
	
	
	
	
	// OPERATORS
	
	function Op(o,l,r){
		// set expression yes, no?
		this._expression = false;
		this._traversed = false;
		this._parens = false;
		this._cache = null;
		this._invert = false;
		this._op = o && o._value || o;
		this._left = l;
		this._right = r;
		return this;
	};
	
	subclass$(Op,Node);
	exports.Op = Op; // export class 
	
	Op.prototype.__op = {name: 'op'};
	Op.prototype.op = function(v){ return this._op; }
	Op.prototype.setOp = function(v){ this._op = v; return this; };
	
	Op.prototype.__left = {name: 'left'};
	Op.prototype.left = function(v){ return this._left; }
	Op.prototype.setLeft = function(v){ this._left = v; return this; };
	
	Op.prototype.__right = {name: 'right'};
	Op.prototype.right = function(v){ return this._right; }
	Op.prototype.setRight = function(v){ this._right = v; return this; };
	
	Op.prototype.visit = function (){
		if (this._right) { this._right.traverse() };
		if (this._left) { this._left.traverse() };
		return this;
	};
	
	Op.prototype.isExpressable = function (){
		// what if right is a string?!?
		return !this.right() || this.right().isExpressable();
	};
	
	Op.prototype.js = function (o){
		var out = null;
		var op = this._op;
		
		var l = this._left;
		var r = this._right;
		
		if (l instanceof Node) { l = l.c() };
		if (r instanceof Node) { r = r.c() };
		
		if (l && r) {
			out = ("" + l + " " + op + " " + r);
		} else if (l) {
			out = ("" + op + l);
		};
		// out = out.parenthesize if up isa Op # really?
		return out;
	};
	
	Op.prototype.shouldParenthesize = function (){
		return this._parens;
		// option(:parens)
	};
	
	Op.prototype.precedence = function (){
		return 10;
	};
	
	Op.prototype.consume = function (node){
		// p "Op.consume {node}".cyan
		if (this.isExpressable()) { return Op.__super__.consume.apply(this,arguments) };
		
		// TODO can rather use global caching?
		var tmpvar = this.scope__().declare('tmp',null,{system: true});
		var clone = OP(this.op(),this.left(),null);
		var ast = this.right().consume(clone);
		if (node) { ast.consume(node) };
		return ast;
	};
	
	
	function ComparisonOp(){ Op.apply(this,arguments) };
	
	subclass$(ComparisonOp,Op);
	exports.ComparisonOp = ComparisonOp; // export class 
	ComparisonOp.prototype.invert = function (){
		// are there other comparison ops?
		// what about a chain?
		var op = this._op;
		var pairs = ["==","!=","===","!==",">","<=","<",">="];
		var idx = pairs.indexOf(op);
		idx += (idx % 2 ? (-1) : (1));
		
		// p "invert {@op}"
		// p "inverted comparison(!) {idx} {op} -> {pairs[idx]}"
		this.setOp(pairs[idx]);
		this._invert = !(this._invert);
		return this;
	};
	
	ComparisonOp.prototype.c = function (){
		if (this.left() instanceof ComparisonOp) {
			this.left().right().cache();
			return OP('&&',this.left(),OP(this.op(),this.left().right(),this.right())).c();
		} else {
			return ComparisonOp.__super__.c.apply(this,arguments);
		};
	};
	
	ComparisonOp.prototype.js = function (o){
		var op = this._op;
		var l = this._left;
		var r = this._right;
		
		if (l instanceof Node) { l = l.c() };
		if (r instanceof Node) { r = r.c() };
		return ("" + l + " " + op + " " + r);
	};
	
	
	
	function MathOp(){ Op.apply(this,arguments) };
	
	subclass$(MathOp,Op);
	exports.MathOp = MathOp; // export class 
	MathOp.prototype.c = function (){
		if (this.op() == '∪') {
			return this.util().union(this.left(),this.right()).c();
		} else if (this.op() == '∩') {
			return this.util().intersect(this.left(),this.right()).c();
		};
	};
	
	
	
	function UnaryOp(){ Op.apply(this,arguments) };
	
	subclass$(UnaryOp,Op);
	exports.UnaryOp = UnaryOp; // export class 
	UnaryOp.prototype.invert = function (){
		if (this.op() == '!') {
			return this.left();
		} else {
			return UnaryOp.__super__.invert.apply(this,arguments); // regular invert
		};
	};
	
	UnaryOp.prototype.js = function (o){
		var l = this._left;
		var r = this._right;
		// all of this could really be done i a much
		// cleaner way.
		// l.set(parens: yes) if l # are we really sure about this?
		// r.set(parens: yes) if r
		
		if (this.op() == '!') {
			l._parens = true;
			// l.set(parens: yes) # sure?
			return "" + this.op() + (l.c());
		} else if (this.op() == '√') {
			return "Math.sqrt(" + (l.c()) + ")";
		} else if (this.left()) {
			return "" + (l.c()) + this.op();
		} else {
			return "" + this.op() + (r.c());
		};
	};
	
	UnaryOp.prototype.normalize = function (){
		if (this.op() == '!' || this.op() == '√') { return this };
		var node = (this.left() || this.right()).node();
		// for property-accessors we need to rewrite the ast
		if (!((node instanceof PropertyAccess))) { return this };
		
		// ask to cache the path
		if ((node instanceof Access) && node.left()) { node.left().cache() };
		
		var num = new Num(1);
		var ast = OP('=',node,OP(this.op()[0],node,num));
		if (this.left()) { ast = OP(this.op()[0] == '-' ? ('+') : ('-'),ast,num) };
		
		return ast;
	};
	
	UnaryOp.prototype.consume = function (node){
		var norm = this.normalize();
		return norm == this ? (UnaryOp.__super__.consume.apply(this,arguments)) : (norm.consume(node));
	};
	
	UnaryOp.prototype.c = function (){
		var norm = this.normalize();
		return norm == this ? (UnaryOp.__super__.c.apply(this,arguments)) : (norm.c());
	};
	
	
	function InstanceOf(){ Op.apply(this,arguments) };
	
	subclass$(InstanceOf,Op);
	exports.InstanceOf = InstanceOf; // export class 
	InstanceOf.prototype.js = function (o){
		// fix checks for String and Number
		// p right.inspect
		
		if (this.right() instanceof Const) {
			// WARN otherwise - what do we do? does not work with dynamic
			// classes etc? Should probably send to utility function isa$
			var name = c__(this.right().value());
			var obj = this.left().node();
			// TODO also check for primitive-constructor
			if (idx$(name,['String','Number','Boolean']) >= 0) {
				if (!((obj instanceof LocalVarAccess))) {
					obj.cache();
				};
				// need a double check for these (cache left) - possibly
				return ("(typeof " + (obj.c()) + "=='" + (name.toLowerCase()) + "'||" + (obj.c()) + " instanceof " + name + ")");
				
				// convert
			};
		};
		var out = ("" + (this.left().c()) + " " + this.op() + " " + (this.right().c()));
		
		// should this not happen in #c?
		if (o.parent() instanceof Op) { out = helpers.parenthesize(out) };
		return out;
	};
	
	
	function TypeOf(){ Op.apply(this,arguments) };
	
	subclass$(TypeOf,Op);
	exports.TypeOf = TypeOf; // export class 
	TypeOf.prototype.js = function (o){
		return "typeof " + (this.left().c());
	};
	
	
	function Delete(){ Op.apply(this,arguments) };
	
	subclass$(Delete,Op);
	exports.Delete = Delete; // export class 
	Delete.prototype.js = function (o){
		// TODO this will execute calls several times if the path is not directly to an object
		// need to cache the receiver
		var l = this.left();
		var tmp = this.scope__().temporary(this,{pool: 'val'});
		var o = OP('=',tmp,l);
		// FIXME
		return ("(" + (o.c()) + ",delete " + (l.c()) + ", " + (tmp.c()) + ")"); // oh well
		// var ast = [OP('=',tmp,left),"delete {left.c}",tmp]
		// should parenthesize directly no?
		// ast.c
	};
	
	Delete.prototype.shouldParenthesize = function (){
		return true;
	};
	
	
	function In(){ Op.apply(this,arguments) };
	
	subclass$(In,Op);
	exports.In = In; // export class 
	In.prototype.invert = function (){
		this._invert = !(this._invert);
		return this;
	};
	
	In.prototype.js = function (o){
		var cond = this._invert ? ("== -1") : (">= 0");
		var idx = Util.indexOf(this.left(),this.right());
		return "" + (idx.c()) + " " + cond;
	};
	
	
	
	
	
	
	
	
	// ACCESS
	
	module.exports.K_IVAR = K_IVAR = 1;
	module.exports.K_SYM = K_SYM = 2;
	module.exports.K_STR = K_STR = 3;
	module.exports.K_PROP = K_PROP = 4;
	
	function Access(o,l,r){
		// set expression yes, no?
		this._expression = false;
		this._traversed = false;
		this._parens = false;
		this._cache = null;
		this._invert = false;
		this._op = o && o._value || o;
		this._left = l;
		this._right = r;
		return this;
	};
	
	subclass$(Access,Op);
	exports.Access = Access; // export class 
	Access.prototype.clone = function (left,right){
		var ctor = this.constructor;
		return new ctor(this.op(),left,right);
	};
	
	Access.prototype.js = function (o){
		var r;
		var raw = null;
		var rgt = this.right();
		var ctx = (this.left() || this.scope__().context());
		var pre = "";
		
		// if safechain
		//	p "Access is safechained {rgt.c}"
		
		
		if (rgt instanceof Num) {
			return ctx.c() + "[" + rgt.c() + "]";
		};
		
		// is this right? Should not the index compile the brackets
		// or value is a symbol -- should be the same, no?
		if ((rgt instanceof Index) && ((rgt.value() instanceof Str) || (rgt.value() instanceof Symbol))) {
			rgt = rgt.value();
		};
		
		// TODO do the identifier-validation in a central place instead
		if ((rgt instanceof Str) && rgt.isValidIdentifier()) {
			raw = rgt.raw();
		} else if ((rgt instanceof Symbol) && rgt.isValidIdentifier()) {
			raw = rgt.raw();
		} else if ((rgt instanceof Identifier) && rgt.isValidIdentifier()) {
			raw = rgt.c();
		};
		
		if (this.safechain() && ctx) {
			ctx.cache({force: true});
			pre = ctx.c() + " && ";
		};
		
		// really?
		// var ctx = (left || scope__.context)
		var out = ctx instanceof RootScopeContext ? (
			// this is a hacky workaround
			(raw ? (raw) : (("global[" + (rgt.c()) + "]")))
		) : (raw ? (
			// see if it needs quoting
			// need to check to see if it is legal
			ctx ? (("" + (ctx.c()) + "." + raw)) : (raw)
		) : (
			r = rgt instanceof Node ? (rgt.c({expression: true})) : (rgt),
			("" + (ctx.c()) + "[" + r + "]")
		));
		
		// if safechain and ctx
		// 	out = "{ctx.c} && {out}"
		
		return pre + out;
	};
	
	Access.prototype.visit = function (){
		if (this.left()) { this.left().traverse() };
		if (this.right()) { this.right().traverse() };
		return;
	};
	
	Access.prototype.isExpressable = function (){
		return true;
	};
	
	Access.prototype.alias = function (){
		return this.right() instanceof Identifier ? (this.right().alias()) : (Access.__super__.alias.call(this));
	};
	
	Access.prototype.safechain = function (){
		// right.safechain
		return String(this._op) == '?.' || String(this._op) == '?:';
	};
	
	Access.prototype.cache = function (o){
		return ((this.right() instanceof Ivar) && !this.left()) ? (this) : (Access.__super__.cache.call(this,o));
	};
	
	
	
	
	// Should change this to just refer directly to the variable? Or VarReference
	function LocalVarAccess(){ Access.apply(this,arguments) };
	
	subclass$(LocalVarAccess,Access);
	exports.LocalVarAccess = LocalVarAccess; // export class 
	
	LocalVarAccess.prototype.__safechain = {name: 'safechain'};
	LocalVarAccess.prototype.safechain = function(v){ return this._safechain; }
	LocalVarAccess.prototype.setSafechain = function(v){ this._safechain = v; return this; };
	
	LocalVarAccess.prototype.js = function (o){
		if ((this.right() instanceof Variable) && this.right().type() == 'meth') {
			if (!((this.up() instanceof Call))) { return ("" + (this.right().c()) + "()") };
		};
		
		return this.right().c();
	};
	
	LocalVarAccess.prototype.variable = function (){
		return this.right();
	};
	
	LocalVarAccess.prototype.cache = function (o){
		if(o === undefined) o = {};
		if (o.force) { LocalVarAccess.__super__.cache.call(this,o) };
		return this;
	};
	
	LocalVarAccess.prototype.alias = function (){
		return this.variable()._alias || LocalVarAccess.__super__.alias.call(this);
	};
	
	
	
	function GlobalVarAccess(){ ValueNode.apply(this,arguments) };
	
	subclass$(GlobalVarAccess,ValueNode);
	exports.GlobalVarAccess = GlobalVarAccess; // export class 
	GlobalVarAccess.prototype.js = function (o){
		return this.value().c();
	};
	
	
	
	function ObjectAccess(){ Access.apply(this,arguments) };
	
	subclass$(ObjectAccess,Access);
	exports.ObjectAccess = ObjectAccess; // export class 
	
	
	
	function PropertyAccess(o,l,r){
		this._traversed = false;
		this._invert = false;
		this._parens = false;
		this._expression = false; // yes?
		this._cache = null;
		this._op = o;
		this._left = l;
		this._right = r;
		return this;
	};
	
	subclass$(PropertyAccess,Access);
	exports.PropertyAccess = PropertyAccess; // export class 
	PropertyAccess.prototype.visit = function (){
		if (this._right) { this._right.traverse() };
		if (this._left) { this._left.traverse() };
		return this;
	};
	
	// right in c we should possibly override
	// to create a call and regular access instead
	
	PropertyAccess.prototype.js = function (o){
		
		var rec;
		if (rec = this.receiver()) {
			// p "converting to call"
			var ast = CALL(OP('.',this.left(),this.right()),[]); // convert to ArgList or null
			ast.setReceiver(rec);
			return ast.c();
		};
		
		var up = this.up();
		
		if (!((up instanceof Call))) {
			// p "convert to call instead"
			ast = CALL(new Access(this.op(),this.left(),this.right()),[]);
			return ast.c();
		};
		
		// really need to fix this - for sure
		// should be possible for the function to remove this this instead?
		var js = ("" + (PropertyAccess.__super__.js.call(this,o)));
		
		if (!((up instanceof Call) || (up instanceof Util.IsFunction))) {
			// p "Called"
			js += "()";
		};
		
		return js;
	};
	
	
	PropertyAccess.prototype.receiver = function (){
		if ((this.left() instanceof SuperAccess) || (this.left() instanceof Super)) {
			return SELF;
		} else {
			return null;
		};
	};
	
	
	
	function IvarAccess(){ Access.apply(this,arguments) };
	
	subclass$(IvarAccess,Access);
	exports.IvarAccess = IvarAccess; // export class 
	IvarAccess.prototype.cache = function (){
		// WARN hmm, this is not right... when accessing on another object it will need to be cached
		return this;
	};
	
	
	
	function ConstAccess(){ Access.apply(this,arguments) };
	
	subclass$(ConstAccess,Access);
	exports.ConstAccess = ConstAccess; // export class 
	
	
	
	function IndexAccess(){ Access.apply(this,arguments) };
	
	subclass$(IndexAccess,Access);
	exports.IndexAccess = IndexAccess; // export class 
	IndexAccess.prototype.cache = function (o){
		if(o === undefined) o = {};
		if (o.force) { return IndexAccess.__super__.cache.apply(this,arguments) };
		this.right().cache();
		return this;
	};
	
	
	
	function SuperAccess(){ Access.apply(this,arguments) };
	
	subclass$(SuperAccess,Access);
	exports.SuperAccess = SuperAccess; // export class 
	SuperAccess.prototype.js = function (o){
		var m = o.method();
		var up = o.parent();
		var deep = (o.parent() instanceof Access);
		
		var out = ("" + (this.left().c()) + ".__super__");
		
		if (!((up instanceof Access))) {
			out += ("." + (m.supername().c()));
			if (!((up instanceof Call))) { // autocall?
				out += (".apply(" + (m.scope().context().c()) + ",arguments)");
			};
		};
		
		return out;
	};
	
	SuperAccess.prototype.receiver = function (){
		return SELF;
	};
	
	
	
	function VarOrAccess(value){
		// should rather call up to valuenode?
		this._traversed = false;
		this._parens = false;
		this._value = value;
		this._identifier = value;
		this._token = value._value;
		this._variable = null;
		this;
	};
	
	// Shortcircuit traverse so that it is not added to the stack?!
	subclass$(VarOrAccess,ValueNode);
	exports.VarOrAccess = VarOrAccess; // export class 
	VarOrAccess.prototype.visit = function (){
		// @identifier = value # this is not a real identifier?
		// console.log "VarOrAccess {@identifier}"
		// p "visit {self}"
		
		
		var scope = this.scope__();
		
		// p "look for variable named {value} in {scope}"
		
		var variable = scope.lookup(this.value());
		
		// does not really need to have a declarator already? -- tricky
		if (variable && variable.declarator()) {
			// var decl = variable.declarator
			
			// if the variable is not initialized just yet and we are
			// in the same scope - we should not treat this as a var-lookup
			// ie.  var x = x would resolve to var x = this.x() if x
			// was not previously defined
			
			// should do this even if we are not in the same scope?
			// we only need to be in the same closure(!)
			
			if (variable._initialized || (scope.closure() != variable.scope().closure())) {
				this._variable = variable;
				variable.addReference(this);
				this._value = variable; // variable.accessor(self)
				this._token._variable = variable;
				return this;
			};
			
			// p "var is not yet initialized!"
			// p "declarator for var {decl.@declared}"
			// FIX
			// @value.safechain = safechain
		};
		
		// TODO deprecate and remove
		if (this.value().symbol().indexOf('$') >= 0) {
			// big hack - should disable
			// major hack here, no?
			console.log("GlobalVarAccess");
			
			this._value = new GlobalVarAccess(this.value());
			return this;
		};
		
		// really? what about just mimicking the two diffrent instead?
		// Should we not return a call directly instead?
		this._value = new PropertyAccess(".",scope.context(),this.value());
		// mark the scope / context -- so we can show correct implicit
		this._token._meta = {type: 'ACCESS'};
		// @value.traverse # nah
		return this;
	};
	
	VarOrAccess.prototype.c = function (){
		return this._variable ? (VarOrAccess.__super__.c.call(this)) : (this.value().c());
	};
	
	VarOrAccess.prototype.js = function (o){
		
		var v;
		if (v = this._variable) {
			var out = v.c();
			if (v._type == 'meth' && !(o.up() instanceof Call)) { out += "()" };
			return out;
		};
		return "NONO";
	};
	
	VarOrAccess.prototype.node = function (){
		return this._variable ? (this) : (this.value());
	};
	
	VarOrAccess.prototype.symbol = function (){
		return this._identifier.symbol();
		// value and value.symbol
	};
	
	VarOrAccess.prototype.cache = function (o){
		if(o === undefined) o = {};
		return this._variable ? ((o.force && VarOrAccess.__super__.cache.call(this,o))) : (this.value().cache(o));
		// should we really cache this?
		// value.cache(o)
	};
	
	VarOrAccess.prototype.decache = function (){
		this._variable ? (VarOrAccess.__super__.decache.call(this)) : (this.value().decache());
		return this;
	};
	
	VarOrAccess.prototype.dom = function (){
		return this.value().dom();
	};
	
	VarOrAccess.prototype.safechain = function (){
		return this._identifier.safechain();
	};
	
	VarOrAccess.prototype.dump = function (){
		return {loc: this.loc()};
	};
	
	VarOrAccess.prototype.loc = function (){
		var loc = this._identifier.region();
		return loc || [0,0];
	};
	
	VarOrAccess.prototype.region = function (){
		return this._identifier.region();
	};
	
	VarOrAccess.prototype.toString = function (){
		return "VarOrAccess(" + this.value() + ")";
	};
	
	
	//	def js
	//		if right isa Variable and right.type == 'meth'
	//			return "{right.c}()" unless up isa Call
	//
	//		right.c
	//
	//	def variable
	//		right
	//
	//	def cache o = {}
	//		super if o:force
	//		self
	//
	//	def alias
	//		variable.@alias or super # if resolved?
	//
	
	function VarReference(value,type){
		
		// for now - this can happen
		// if value isa Arr
		
		VarReference.__super__.constructor.call(this,value);
		this._export = false;
		this._type = type && String(type);
		this._variable = null;
		this._declared = true; // just testing now
	};
	
	subclass$(VarReference,ValueNode);
	exports.VarReference = VarReference; // export class 
	
	VarReference.prototype.__variable = {name: 'variable'};
	VarReference.prototype.variable = function(v){ return this._variable; }
	VarReference.prototype.setVariable = function(v){ this._variable = v; return this; };
	
	VarReference.prototype.__declared = {name: 'declared'};
	VarReference.prototype.declared = function(v){ return this._declared; }
	VarReference.prototype.setDeclared = function(v){ this._declared = v; return this; };
	
	VarReference.prototype.__type = {name: 'type'};
	VarReference.prototype.type = function(v){ return this._type; }
	VarReference.prototype.setType = function(v){ this._type = v; return this; };
	
	VarReference.prototype.loc = function (){
		// p "loc for VarReference {@value:constructor} {@value.@value:constructor} {@value.region}"
		return this._value.region();
	};
	
	VarReference.prototype.set = function (o){
		// hack - workaround for hidden classes perf
		if (o.export) { this._export = true };
		return this;
	};
	
	VarReference.prototype.js = function (o){
		// experimental fix
		
		// what about resolving?
		var ref = this._variable;
		var out = ref.c();
		
		// p "VarReference {out} - {o.up} {o.up == self}\n{o}"
		
		if (ref && !(ref._declared)) { // .option(:declared)
			if (o.up(VarBlock)) { // up varblock??
				ref._declared = true;
				
				// ref.set(declared: yes)
			} else if (o.isExpression() || this._export) { // why?
				// p "autodeclare"
				ref.autodeclare();
			} else {
				// 
				out = ("var " + out);
				ref._declared = true;
				// ref.set(declared: yes)
			};
		};
		
		// need to think the export through -- like registering somehow
		// should register in scope - export on analysis++
		if (this._export) {
			out = ("module.exports." + (ref.c()) + " = " + (ref.c()));
		};
		
		return out;
	};
	
	VarReference.prototype.declare = function (){
		return this;
	};
	
	VarReference.prototype.consume = function (node){
		// really? the consumed node dissappear?
		this._variable && this._variable.autodeclare();
		return this;
	};
	
	VarReference.prototype.visit = function (){
		// p "visit vardecl"
		// console.log "value type for VarReference {@value} {@value.@loc} {@value:constructor}"
		
		// should be possible to have a VarReference without a name as well? for a system-variable
		var name = this.value().c();
		
		// what about looking up? - on register we want to mark
		var v = this._variable || (this._variable = this.scope__().register(name,this,{type: this._type}));
		// FIXME -- should not simply override the declarator here(!)
		
		if (!(v.declarator())) {
			v.setDeclarator(this);
		};
		
		if (this._value) { v.addReference(this._value) }; // is this the first reference?
		
		// only needed when analyzing?
		this._value._value._variable = v;
		return this;
	};
	
	VarReference.prototype.refnr = function (){
		return this.variable().references().indexOf(this.value());
	};
	
	// convert this into a list of references
	VarReference.prototype.addExpression = function (expr){
		
		return new VarBlock([this]).addExpression(expr);
	};
	
	
	
	// ASSIGN
	
	function Assign(o,l,r){
		
		// workaround until we complete transition from lua-style assignments
		// to always use explicit tuples - then we can move assignments out etc
		// this will not be needed after we remove support for var a,b,c = 1,2,3
		if ((l instanceof VarReference) && (l.value() instanceof Arr)) {
			// p "case with var!!"
			// converting all nodes to var-references ?
			// do we need to keep it in a varblock at all?
			var vars = l.value().nodes().map(function(v) {
				// what about inner tuples etc?
				// keep the splats -- clumsy but true
				var v_;
				if (v instanceof Splat) {
					// p "value is a splat!!"
					if (!((v.value() instanceof VarReference))) { (v.setValue(v_=new VarReference(v.value(),l.type())),v_) };
				} else if (v instanceof VarReference) {
					true;
				} else {
					v = new VarReference(v,l.type());
				};
				
				return v;
				
				// v isa VarReference ? v : VarReference.new(v)
			});
			return new TupleAssign(o,new Tuple(vars),r);
		};
		
		if (l instanceof Arr) {
			return new TupleAssign(o,new Tuple(l.nodes()),r);
			// p "left is array in assign - in init"
		};
		
		
		// set expression yes, no?
		this._expression = false;
		this._traversed = false;
		this._parens = false;
		this._cache = null;
		this._invert = false;
		this._op = o && o._value || o;
		this._left = l;
		this._right = r;
		return this;
	};
	
	subclass$(Assign,Op);
	exports.Assign = Assign; // export class 
	Assign.prototype.isExpressable = function (){
		return !this.right() || this.right().isExpressable();
	};
	
	Assign.prototype.isUsed = function (){
		// really?
		// if up is a block in general this should not be used -- since it should already have received implicit self?
		if (this.up() instanceof Block) { // && up.last != self
			return false;
		};
		return true;
	};
	
	// FIXME optimize
	Assign.prototype.visit = function (){
		var l = this._left;
		var r = this._right;
		
		// WARNING - slightly undefined
		// MARK THE STACK
		if (l) { l.traverse() };
		
		var lvar = (l instanceof VarReference) && l.variable();
		
		// p "assign {l} {r} {l.value}"
		
		
		
		// this should probably be done in a different manner
		if (lvar && lvar.declarator() == l) {
			lvar._initialized = false;
			if (r) { r.traverse() };
			lvar._initialized = true;
		} else {
			if (r) { r.traverse() };
		};
		
		if ((l instanceof VarReference) || l._variable) {
			l._variable.assigned(r,this);
		};
		
		return this;
	};
	
	Assign.prototype.c = function (o){
		if (!(this.right().isExpressable())) {
			// p "Assign#c right is not expressable "
			return this.right().consume(this).c(o);
		};
		// testing this
		return Assign.__super__.c.call(this,o);
	};
	
	Assign.prototype.js = function (o){
		if (!(this.right().isExpressable())) {
			this.p("Assign#js right is not expressable ");
			// here this should be go out of the stack(!)
			// it should already be consumed?
			return this.right().consume(this).c();
		};
		
		// p "assign left {left:contrstru}"
		var l = this.left().node();
		var r = this.right();
		
		// We are setting self(!)
		// TODO document functionality
		if (l instanceof Self) {
			var ctx = this.scope__().context();
			l = ctx.reference();
		};
		
		
		if (l instanceof PropertyAccess) {
			var ast = CALL(OP('.',l.left(),l.right().setter()),[this.right()]);
			ast.setReceiver(l.receiver());
			
			if (this.isUsed()) {
				// p "Assign is used {stack}"
				// dont cache it again if it is already cached(!)
				if (!(this.right().cachevar())) { this.right().cache({pool: 'val',uses: 1}) }; // 
				// this is only when used.. should be more clever about it
				ast = new Parens(blk__([ast,this.right()]));
			};
			
			// should check the up-value no?
			return ast.c({expression: true});
		};
		
		// if l isa VarReference
		// 	p "assign var-ref"
		// 	l.@variable.assigned(r)
		
		// FIXME -- does not always need to be an expression?
		var out = ("" + (l.c()) + " " + this.op() + " " + (this.right().c({expression: true})));
		
		return out;
	};
	
	// FIXME op is a token? _FIX_
	Assign.prototype.shouldParenthesize = function (){
		return (this.up() instanceof Op) && this.up().op() != '=';
	};
	
	Assign.prototype.consume = function (node){
		if (this.isExpressable()) {
			this.forceExpression();
			return Assign.__super__.consume.call(this,node);
		};
		
		var ast = this.right().consume(this);
		return ast.consume(node);
	};
	
	// more workaround during transition away from a,b,c = 1,2,3 style assign
	Assign.prototype.addExpression = function (expr){
		var typ = ExpressionBlock;
		if (this._left && (this._left instanceof VarReference)) {
			typ = VarBlock;
		};
		// might be better to nest this up after parsing is done?
		// p "Assign.addExpression {self} <- {expr}"
		var node = new typ([this]);
		return node.addExpression(expr);
	};
	
	
	
	function PushAssign(){ Assign.apply(this,arguments) };
	
	subclass$(PushAssign,Assign);
	exports.PushAssign = PushAssign; // export class 
	PushAssign.prototype.js = function (o){
		return "" + (this.left().c()) + ".push(" + (this.right().c()) + ")";
	};
	
	PushAssign.prototype.consume = function (node){
		return this;
	};
	
	
	
	function ConditionalAssign(){ Assign.apply(this,arguments) };
	
	subclass$(ConditionalAssign,Assign);
	exports.ConditionalAssign = ConditionalAssign; // export class 
	ConditionalAssign.prototype.consume = function (node){
		return this.normalize().consume(node);
	};
	
	ConditionalAssign.prototype.normalize = function (){
		var l = this.left().node();
		var ls = l;
		
		if (l instanceof Access) {
			// p "conditional-assign {l} {l.left} {l.right}"
			if (l.left()) {
				// p "cache l.left {l.left:constructor}̋"
				l.left().cache();
			};
			ls = l.clone(l.left(),l.right()); // this should still be cached?
			if (l instanceof PropertyAccess) { l.cache() }; // correct now, to a certain degree
			if (l instanceof IndexAccess) {
				// p "cache the right side of indexAccess!!! {l.right}"
				l.right().cache();
			};
			
			// we should only cache the value itself if it is dynamic?
			// l.cache # cache the value as well -- we cannot use this in assigns them
		};
		
		// some ops are less messy
		// need op to support consume then?
		var expr = this.right().isExpressable();
		var ast = null;
		// here we should use ast = if ...
		if (expr && this.op() == '||=') {
			ast = OP('||',l,OP('=',ls,this.right()));
		} else if (expr && this.op() == '&&=') {
			ast = OP('&&',l,OP('=',ls,this.right()));
		} else {
			ast = IF(this.condition(),OP('=',ls,this.right()),l); // do we need a scope for these?
			ast.setScope(null);
			// drop the scope
			// touch scope -- should probably visit the whole thing?
			// ast.scope.visit
		};
		if (ast.isExpressable()) { ast.toExpression() };
		return ast;
	};
	
	
	ConditionalAssign.prototype.c = function (){
		// WARN what if we return the same?
		return this.normalize().c();
	};
	
	ConditionalAssign.prototype.condition = function (){
		
		// use switch instead to cache op access
		if (this.op() == '?=') {
			return OP('==',this.left(),NULL);
		} else if (this.op() == '||=') {
			return OP('!',this.left());
		} else if (this.op() == '&&=') {
			return this.left();
		} else if (this.op() == '!?=') {
			return OP('!=',this.left(),NULL);
		} else {
			return this.left();
		};
	};
	
	ConditionalAssign.prototype.js = function (o){
		// p "ConditionalAssign.js".red
		var ast = IF(this.condition(),OP('=',this.left(),this.right()),this.left());
		ast.setScope(null); // not sure about this
		if (ast.isExpressable()) { ast.toExpression() }; // forced expression already
		return ast.c();
	};
	
	
	function CompoundAssign(){ Assign.apply(this,arguments) };
	
	subclass$(CompoundAssign,Assign);
	exports.CompoundAssign = CompoundAssign; // export class 
	CompoundAssign.prototype.consume = function (node){
		if (this.isExpressable()) { return CompoundAssign.__super__.consume.apply(this,arguments) };
		
		var ast = this.normalize();
		if (ast != this) { return ast.consume(node) };
		
		ast = this.right().consume(this);
		return ast.consume(node);
	};
	
	CompoundAssign.prototype.normalize = function (){
		var ln = this.left().node();
		// we dont need to change this at all
		if (!((ln instanceof PropertyAccess))) {
			return this;
		};
		
		if (ln instanceof Access) {
			// left might be zero?!?!
			if (ln.left()) { ln.left().cache() };
		};
		// TODO FIXME we want to cache the context of the assignment
		// p "normalize compound assign {left}"
		var ast = OP('=',this.left(),OP(this.op()[0],this.left(),this.right()));
		if (ast.isExpressable()) { ast.toExpression() };
		
		return ast;
	};
	
	CompoundAssign.prototype.c = function (){
		var ast = this.normalize();
		if (ast == this) { return CompoundAssign.__super__.c.apply(this,arguments) };
		
		// otherwise it is important that we actually replace this node in the outer block
		// whenever we normalize and override c it is important that we can pass on caching
		// etc -- otherwise there WILL be issues.
		var up = STACK.current();
		if (up instanceof Block) {
			// p "parent is block, should replace!"
			// an alternative would be to just pass
			up.replace(this,ast);
		};
		return ast.c();
	};
	
	
	
	function AsyncAssign(){ Assign.apply(this,arguments) };
	
	subclass$(AsyncAssign,Assign);
	exports.AsyncAssign = AsyncAssign; // export class 
	
	
	
	function TupleAssign(a,b,c){
		this._traversed = false;
		this._op = a;
		this._left = b;
		this._right = c;
		this._temporary = [];
	};
	
	subclass$(TupleAssign,Assign);
	exports.TupleAssign = TupleAssign; // export class 
	
	TupleAssign.prototype.__op = {name: 'op'};
	TupleAssign.prototype.op = function(v){ return this._op; }
	TupleAssign.prototype.setOp = function(v){ this._op = v; return this; };
	
	TupleAssign.prototype.__left = {name: 'left'};
	TupleAssign.prototype.left = function(v){ return this._left; }
	TupleAssign.prototype.setLeft = function(v){ this._left = v; return this; };
	
	TupleAssign.prototype.__right = {name: 'right'};
	TupleAssign.prototype.right = function(v){ return this._right; }
	TupleAssign.prototype.setRight = function(v){ this._right = v; return this; };
	
	TupleAssign.prototype.__type = {name: 'type'};
	TupleAssign.prototype.type = function(v){ return this._type; }
	TupleAssign.prototype.setType = function(v){ this._type = v; return this; };
	
	TupleAssign.prototype.isExpressable = function (){
		return this.right().isExpressable();
	};
	
	TupleAssign.prototype.addExpression = function (expr){
		if (this.right() instanceof Tuple) {
			this.right().push(expr);
		} else {
			// p "making child become a tuple?"
			this.setRight(new Tuple([this.right(),expr]));
		};
		
		return this;
	};
	
	TupleAssign.prototype.visit = function (){
		// if the first left-value is a var-reference, then
		// all the variables should be declared as variables.
		// but if we have complex items in the other list - it does become much harder
		
		// if the first is a var-reference, they should all be(!) .. or splats?
		// this is really a hacky wao to do it though
		if (this.left().first().node() instanceof VarReference) {
			this.setType('var');
			// should possibly allow real vars as well, no?
			this._vars = this.left().nodes().filter(function(n) {
				return n instanceof VarReference;
			});
			// collect the vars for tuple for easy access
			
			// NOTE can improve.. should rather make the whole left be a VarBlock or TupleVarBlock
			// p "type is var -- skip the rest"
		};
		
		this.right().traverse();
		this.left().traverse();
		return this;
	};
	
	TupleAssign.prototype.js = function (o){
		// only for actual inner expressions, otherwise cache the whole array, no?
		var self=this;
		if (!(self.right().isExpressable())) {
			// p "TupleAssign.consume! {right}".blue
			
			return self.right().consume(self).c();
		};
		
		// p "TUPLE {type}"
		
		/* a,b,c = arguments */
		
		// - direct. no matter if lvalues are variables or not. Make fake arguments up to the same count as tuple
		
		/* a,*b,b = arguments */
		
		// Need to convert arguments to an array. IF arguments is not referenced anywhere else in scope, 
		// we can do the assignment directly while rolling through arguments
		
		/* a,b = b,a */
		
		// ideally we only need to cache the first value (or n - 1), assign directly when possible.
		
		/* a,b,c = (method | expression) */
		
		// convert res into array, assign from array. Can cache the variable when assigning first value
		
		// First we need to find out whether we are required to store the result in an array before assigning
		// If this needs to be an expression (returns?, we need to fall back to the CS-wa)
		
		var ast = new Block([]);
		var lft = self.left();
		var rgt = self.right();
		var typ = self.type();
		var via = null;
		
		var li = 0;
		var ri = lft.count();
		var llen = ri;
		
		
		// if @vars
		// 	p "tuple has {@vars:length} vars"
		
		// if we have a splat on the left it is much more likely that we need to store right
		// in a temporary array, but if the right side has a known length, it should still not be needed
		var lsplat = lft.filter(function(v) {
			return v instanceof Splat;
		})[0];
		
		// if right is an array without any splats (or inner tuples?), normalize it to tuple
		if ((rgt instanceof Arr) && !(rgt.splat())) { rgt = new Tuple(rgt.nodes()) };
		var rlen = rgt instanceof Tuple ? (rgt.count()) : (null);
		
		// if any values are statements we need to handle this before continuing
		
		/* a,b,c = 10,20,ary */
		
		// ideally we only need to cache the first value (or n - 1), assign directly when possible.
		// only if the variables are not predefined or predeclared can be we certain that we can do it without caching
		// if rlen && typ == 'var' && !lsplat
		// 	# this can be dangerous in edgecases that are very hard to detect
		// 	# if it becomes an issue, fall back to simpler versions
		// 	# does not even matter if there is a splat?
		
		// special case for arguments(!)
		if (!lsplat && rgt == ARGUMENTS) {
			
			var pars = self.scope__().params();
			// p "special case with arguments {pars}"
			// forcing the arguments to be named
			// p "got here??? {pars}"
			lft.map(function(l,i) {
				return ast.push(OP('=',l.node(),pars.at(i,true).visit().variable()));
			}); // s.params.at(value - 1,yes)
		} else if (rlen) {
			// we have several items in the right part. what about splats here?
			
			// pre-evaluate rvalues that might be reference from other assignments
			// we need to check if the rightside values has no side-effects. Cause if
			// they dont, we really do not need temporary variables.
			
			// some of these optimizations are quite petty - makes things more complicated
			// in the compiler only to get around adding a few temp-variables here and there
			
			// var firstUnsafe = 0
			// lft.map do |v,i|
			// 	if v isa VarReference
			// 		p "left side {i} {v} {v.refnr}"
			
			// rgt.map do |v,i|
			// 	if v.hasSideEffects
			// 		# return if i == 0 or !v.hasSideEffects
			// 		# return if v isa Num || v isa Str || i == 0
			// 		# we could explicitly create a temporary variable and adding nodes for accessing etc
			// 		# but the builtin caching should really take care of this for us
			// 		# we need to really force the caching though -- since we need a copy of it even if it is a local
			// 		# we need to predeclare the variables at the top of scope if this does not take care of it
			// 		
			// 		# these are the declarations -- we need to add them somewhere smart
			// 		@temporary.push(v) # need a generalized way to do this type of thing
			// 		ast.push(v.cache(force: yes, type: 'swap', declared: typ == 'var'))
			// 		# they do need to be declared, no?
			
			// now we can free the cached variables
			// ast.map do |n| n.decache
			
			var pre = [];
			var rest = [];
			
			var pairs = lft.map(function(l,i) {
				var v = null;
				// determine if this needs to be precached?
				// if l isa VarReference
				// 	# this is the first time the variable is referenced
				// 	# should also count even if it is predeclared at the top
				// 	if l.refnr == 0
				
				if (l == lsplat) {
					v = new ArgList([]);
					var to = (rlen - (ri - i));
					// p "assing splat at index {i} to slice {li} - {to}".cyan
					while (li <= to){
						v.push(rgt.index(li++));
					};
					v = new Arr(v);
					// ast.push OP('=',l.node,Arr.new(v))
				} else {
					v = rgt.index(li++);
				};
				return [l.node(),v];
				
				// if l isa VarReference && l.refnr 
			});
			var clean = true;
			
			pairs.map(function(v,i) {
				var l = v[0];
				var r = v[1];
				
				if (clean) {
					if ((l instanceof VarReference) && l.refnr() == 0) {
						// still clean
						clean = true;
					} else {
						clean = false;
						// p "now cache"
						pairs.slice(i).map(function(part) {
							if (part[1].hasSideEffects()) {
								self._temporary.push(part[1]); // need a generalized way to do this type of thing
								return ast.push(part[1].cache({force: true,pool: 'swap',declared: typ == 'var'}));
							};
						});
						// p "from {i} - cache all remaining with side-effects"
					};
				};
				
				// if the previous value in ast is a reference to our value - the caching was not needed
				if (ast.last() == r) {
					r.decache();
					// p "was cached - not needed"
					// simple assign
					return ast.replace(r,OP('=',l,r));
				} else {
					return ast.push(OP('=',l,r));
				};
			});
			
			// WARN FIXME Is there not an issue with VarBlock vs not here?
		} else {
			// this is where we need to cache the right side before assigning
			// if the right side is a for loop, we COULD try to be extra clever, but
			// for now it is not worth the added compiler complexity
			
			// iter.cache(force: yes, type: 'iter')
			var top = new VarBlock();
			var iter = self.util().iterable(rgt,true);
			// could set the vars inside -- most likely
			ast.push(top);
			top.push(iter);
			
			if (lsplat) {
				var len = self.util().len(iter,true);
				var idx = self.util().counter(0,true);
				// cache the length of the array
				top.push(len); // preassign the length
				// cache counter to loop through
				top.push(idx);
			};
			
			// only if the block is variable based, no?
			// ast.push(blk = VarBlock.new)
			// blk = null
			
			var blktype = typ == 'var' ? (VarBlock) : (Block);
			var blk = new blktype([]);
			// blk = top if typ == 'var'
			ast.push(blk);
			
			// if the lvals are not variables - we need to preassign
			// can also use slice here for simplicity, but try with while now			
			lft.map(function(l,i) {
				if (l == lsplat) {
					var lvar = l.node();
					var rem = llen - i - 1; // remaining after splat
					
					if (typ != 'var') {
						var arr = self.util().array(OP('-',len,num__(i + rem)),true);
						top.push(arr);
						lvar = arr.cachevar();
					} else {
						if (!blk) { ast.push(blk = new blktype()) };
						arr = self.util().array(OP('-',len,num__(i + rem)));
						blk.push(OP('=',lvar,arr));
					};
					
					// if !lvar:variable || !lvar.variable # lvar = 
					// 	top.push()
					//	p "has variable - no need to create a temp"
					// blk.push(OP('=',lvar,Arr.new([]))) # dont precalculate size now
					// max = to = (rlen - (llen - i))
					
					
					var test = rem ? (OP('-',len,rem)) : (len);
					
					var set = OP('=',OP('.',lvar,OP('-',idx,num__(i))),
					OP('.',iter,OP('++',idx)));
					
					ast.push(WHILE(OP('<',idx,test),set));
					
					if (typ != 'var') {
						ast.push(blk = new Block());
						return blk.push(OP('=',l.node(),lvar));
					} else {
						return blk = null;
					};
					
					// not if splat was last?
					// ast.push(blk = VarBlock.new)
				} else if (lsplat) {
					if (!blk) { ast.push(blk = new blktype()) };
					// we could cache the raw code of this node for better performance
					return blk.push(OP('=',l,OP('.',iter,OP('++',idx))));
				} else {
					if (!blk) { ast.push(blk = new blktype()) };
					return blk.push(OP('=',l,OP('.',iter,num__(i))));
				};
			});
		};
		
		// if we are in an expression we really need to 
		if (o.isExpression() && self._vars) {
			// p "tuple is expression" # variables MUST be autodeclared outside of the expression
			for (var i=0, ary=iter$(self._vars), len_=ary.length; i < len_; i++) {
				ary[i].variable().autodeclare();
			};
		} else if (self._vars) {
			for (var i=0, ary=iter$(self._vars), len_=ary.length; i < len_; i++) {
				// p "predeclare variable before compilation"
				ary[i].variable().predeclared();
			};
		};
		
		// is there any reason to make it into an expression?
		if (ast.isExpressable()) { // NO!
			// p "express"
			// if this is an expression
			var out = ast.c({expression: true});
			if (typ && !(o.isExpression())) { out = ("" + typ + " " + out) }; // not in expression
			return out;
		} else {
			out = ast.c();
			// if this is a varblock 
			return out;
		};
	};
	
	
	TupleAssign.prototype.c = function (o){
		var out = TupleAssign.__super__.c.call(this,o);
		// this is only used in tuple -- better to let the tuple hav a separate #c
		if (this._temporary && this._temporary.length) {
			this._temporary.map(function(temp) {
				return temp.decache();
			});
		};
		return out;
	};
	
	
	
	
	// IDENTIFIERS
	
	// really need to clean this up
	// Drop the token?
	function Identifier(value){
		this._value = this.load(value);
		this._symbol = null;
		this._setter = null;
		
		if (("" + value).indexOf("?") >= 0) {
			this._safechain = true;
		};
		// @safechain = ("" + value).indexOf("?") >= 0
		this;
	};
	
	subclass$(Identifier,Node);
	exports.Identifier = Identifier; // export class 
	
	Identifier.prototype.__safechain = {name: 'safechain'};
	Identifier.prototype.safechain = function(v){ return this._safechain; }
	Identifier.prototype.setSafechain = function(v){ this._safechain = v; return this; };
	
	Identifier.prototype.__value = {name: 'value'};
	Identifier.prototype.value = function(v){ return this._value; }
	Identifier.prototype.setValue = function(v){ this._value = v; return this; };
	
	Identifier.prototype.references = function (variable){
		if (this._value) { this._value._variable = variable };
		return this;
	};
	
	Identifier.prototype.load = function (v){
		return (v instanceof Identifier ? (v.value()) : (v));
	};
	
	Identifier.prototype.traverse = function (){
		// NODES.push(self)
		return this;
	};
	
	Identifier.prototype.visit = function (){
		
		if (this._value instanceof Node) {
			// console.log "IDENTIFIER VALUE IS NODE"
			this._value.traverse();
		};
		return this;
	};
	
	Identifier.prototype.region = function (){
		return [this._value._loc,this._value._loc + this._value._len];
	};
	
	Identifier.prototype.isValidIdentifier = function (){
		return true;
	};
	
	Identifier.prototype.isReserved = function (){
		
		return this._value.reserved;
	};
	
	Identifier.prototype.symbol = function (){
		// console.log "Identifier#symbol {value}"
		return this._symbol || (this._symbol = sym__(this.value()));
	};
	
	Identifier.prototype.setter = function (){
		// console.log "Identifier#setter"
		return this._setter || (this._setter = new Identifier(("set-" + (this.value().c()))));
	};
	
	Identifier.prototype.toString = function (){
		return String(this._value);
	};
	
	Identifier.prototype.alias = function (){
		return sym__(this._value);
	};
	
	Identifier.prototype.js = function (o){
		return this.symbol();
	};
	
	Identifier.prototype.c = function (){
		return this.symbol();
	};
	
	Identifier.prototype.dump = function (){
		return {loc: this.region()};
	};
	
	
	
	function TagId(v){
		this._value = v instanceof Identifier ? (v.value()) : (v);
		this;
	};
	
	subclass$(TagId,Identifier);
	exports.TagId = TagId; // export class 
	TagId.prototype.c = function (){
		return "id$('" + (this.value().c()) + "')";
	};
	
	
	// This is not an identifier - it is really a string
	// Is this not a literal?
	
	// FIXME Rename to IvarLiteral? or simply Literal with type Ivar
	function Ivar(v){
		this._value = v instanceof Identifier ? (v.value()) : (v);
		this;
	};
	
	subclass$(Ivar,Identifier);
	exports.Ivar = Ivar; // export class 
	Ivar.prototype.name = function (){
		return helpers.camelCase(this._value).replace(/^@/,'');
		// value.c.camelCase.replace(/^@/,'')
	};
	
	Ivar.prototype.alias = function (){
		return '_' + this.name();
	};
	
	// the @ should possibly be gone from the start?
	Ivar.prototype.js = function (o){
		return '_' + this.name();
	};
	
	Ivar.prototype.c = function (){
		return '_' + helpers.camelCase(this._value).slice(1); // .replace(/^@/,'')
	};
	
	
	// Ambiguous - We need to be consistent about Const vs ConstAccess
	// Becomes more important when we implement typeinference and code-analysis
	function Const(){ Identifier.apply(this,arguments) };
	
	subclass$(Const,Identifier);
	exports.Const = Const; // export class 
	Const.prototype.symbol = function (){
		// console.log "Identifier#symbol {value}"
		return this._symbol || (this._symbol = sym__(this.value()));
	};
	
	Const.prototype.js = function (o){
		return this.symbol();
	};
	
	Const.prototype.c = function (){
		return this.symbol();
	};
	
	
	function TagTypeIdentifier(value){
		this._value = this.load(value);
		this;
	};
	
	subclass$(TagTypeIdentifier,Identifier);
	exports.TagTypeIdentifier = TagTypeIdentifier; // export class 
	
	TagTypeIdentifier.prototype.__name = {name: 'name'};
	TagTypeIdentifier.prototype.name = function(v){ return this._name; }
	TagTypeIdentifier.prototype.setName = function(v){ this._name = v; return this; };
	
	TagTypeIdentifier.prototype.__ns = {name: 'ns'};
	TagTypeIdentifier.prototype.ns = function(v){ return this._ns; }
	TagTypeIdentifier.prototype.setNs = function(v){ this._ns = v; return this; };
	
	TagTypeIdentifier.prototype.load = function (val){
		this._str = ("" + val);
		var parts = this._str.split(":");
		this._raw = val;
		this._name = parts.pop();
		this._ns = parts.shift(); // if any?
		return this._str;
	};
	
	TagTypeIdentifier.prototype.js = function (o){
		// p "tagtypeidentifier.js {self}"
		return ("IMBA_TAGS." + (this._str.replace(":","$")));
	};
	
	TagTypeIdentifier.prototype.c = function (){
		return this.js();
	};
	
	TagTypeIdentifier.prototype.func = function (){
		var name = this._name.replace(/-/g,'_').replace(/\#/,'');
		if (this._ns) { name += ("$" + (this._ns.toLowerCase())) };
		return name;
	};
	
	TagTypeIdentifier.prototype.id = function (){
		var m = this._str.match(/\#([\w\-\d\_]+)\b/);
		return m ? (m[1]) : (null);
	};
	
	
	TagTypeIdentifier.prototype.flag = function (){
		return "_" + this.name().replace(/--/g,'_').toLowerCase();
	};
	
	TagTypeIdentifier.prototype.sel = function (){
		return "." + this.flag(); // + name.replace(/-/g,'_').toLowerCase
	};
	
	TagTypeIdentifier.prototype.string = function (){
		return this.value();
	};
	
	
	
	function Argvar(){ ValueNode.apply(this,arguments) };
	
	subclass$(Argvar,ValueNode);
	exports.Argvar = Argvar; // export class 
	Argvar.prototype.c = function (){
		// NEXT -- global.parseInt or Number.parseInt (better)
		var v = parseInt(String(this.value()));
		// FIXME Not needed anymore? I think the lexer handles this
		if (v == 0) { return "arguments" };
		
		var s = this.scope__();
		// params need to go up to the closeste method-scope
		var par = s.params().at(v - 1,true);
		return "" + (c__(par.name())); // c
	};
	
	
	
	// CALL
	
	function Call(callee,args,opexists){
		this._traversed = false;
		this._expression = false;
		this._parens = false;
		this._cache = null;
		this._receiver = null;
		this._opexists = opexists;
		// some axioms that share the same syntax as calls will be redirected from here
		
		if (callee instanceof VarOrAccess) {
			var str = callee.value().symbol();
			// p "Call callee {callee} - {str}"
			if (str == 'extern') {
				// p "returning extern instead!"
				return new ExternDeclaration(args);
			};
			if (str == 'tag') {
				// console.log "ERROR - access args by some method"
				return new TagWrapper(args && args.index ? (args.index(0)) : (args[0]));
			};
			if (str == 'export') {
				return new ExportStatement(args);
			};
		};
		
		this._callee = callee;
		this._args = args || new ArgList([]);
		
		if (args instanceof Array) {
			this._args = new ArgList(args);
			// console.log "ARGUMENTS IS ARRAY - error {args}"
		};
		// p "call opexists {opexists}"
		this;
	};
	
	subclass$(Call,Node);
	exports.Call = Call; // export class 
	
	Call.prototype.__callee = {name: 'callee'};
	Call.prototype.callee = function(v){ return this._callee; }
	Call.prototype.setCallee = function(v){ this._callee = v; return this; };
	
	Call.prototype.__receiver = {name: 'receiver'};
	Call.prototype.receiver = function(v){ return this._receiver; }
	Call.prototype.setReceiver = function(v){ this._receiver = v; return this; };
	
	Call.prototype.__args = {name: 'args'};
	Call.prototype.args = function(v){ return this._args; }
	Call.prototype.setArgs = function(v){ this._args = v; return this; };
	
	Call.prototype.__block = {name: 'block'};
	Call.prototype.block = function(v){ return this._block; }
	Call.prototype.setBlock = function(v){ this._block = v; return this; };
	
	Call.prototype.visit = function (){
		// console.log "visit args {args}"
		this.args().traverse();
		this.callee().traverse();
		
		// if the callee is a PropertyAccess - better to immediately change it
		
		return this._block && this._block.traverse();
	};
	
	Call.prototype.addBlock = function (block){
		var pos = this._args.filter(function(n,i) {
			return n == '&';
		})[0]; // WOULD BE TOKEN - CAREFUL
		pos ? (this.args().replace(pos,block)) : (this.args().push(block));
		return this;
	};
	
	Call.prototype.receiver = function (){
		return this._receiver || (this._receiver = ((this.callee() instanceof Access) && this.callee().left() || NULL));
	};
	
	// check if all arguments are expressions - otherwise we have an issue
	
	Call.prototype.safechain = function (){
		return this.callee().safechain(); // really?
	};
	
	Call.prototype.js = function (o){
		var opt = {expression: true};
		var rec = null;
		// var args = compact__(args) # really?
		var args = this.args();
		
		// drop this?
		
		var splat = args.some(function(v) {
			return v instanceof Splat;
		});
		
		var out = null;
		var lft = null;
		var rgt = null;
		var wrap = null;
		
		var callee = this._callee = this._callee.node(); // drop the var or access?
		
		// if callee isa Call && callee.safechain
		//	yes
		
		if (callee instanceof Access) {
			lft = callee.left();
			rgt = callee.right();
		};
		
		if ((callee instanceof Super) || (callee instanceof SuperAccess)) {
			this._receiver = this.scope__().context();
			// return "supercall"
		};
		
		// never call the property-access directly?
		if (callee instanceof PropertyAccess) { // && rec = callee.receiver
			// p "unwrapping property-access in call"
			this._receiver = callee.receiver();
			callee = this._callee = new Access(callee.op(),callee.left(),callee.right());
			// p "got here? {callee}"
			// console.log "unwrapping the propertyAccess"
		};
		
		if (callee.safechain()) {
			// p "callee is safechained?!?"
			// if lft isa Call
			// if lft isa Call # could be a property access as well - it is the same?
			// if it is a local var access we simply check if it is a function, then call
			// but it should be safechained outside as well?
			// lft.cache if lft
			// the outer safechain should not cache the whole call - only ask to cache
			// the result? -- chain onto
			// p "Call safechain {callee} {lft}.{rgt}"
			var isfn = new Util.IsFunction([callee]);
			wrap = [("" + (isfn.c()) + "  &&  "),""];
			callee = OP('.',callee.left(),callee.right());
			// callee should already be cached now - 
		};
		
		// should just force expression from the start, no?
		if (splat) {
			// important to wrap the single value in a value, to keep implicit call
			// this is due to the way we check for an outer Call without checking if
			// we are the receiver (in PropertyAccess). Should rather wrap in CallArguments
			var ary = (args.count() == 1 ? (new ValueNode(args.first().value())) : (new Arr(args.list())));
			this.receiver().cache(); // need to cache the target
			out = ("" + (callee.c({expression: true})) + ".apply(" + (this.receiver().c()) + "," + (ary.c({expression: true})) + ")");
		} else if (this._receiver) {
			// quick workaround
			if (!((this._receiver instanceof ScopeContext))) { this._receiver.cache() };
			args.unshift(this.receiver());
			// should rather rewrite to a new call?
			out = ("" + (callee.c({expression: true})) + ".call(" + (args.c({expression: true})) + ")");
		} else {
			out = ("" + (callee.c({expression: true})) + "(" + (args.c({expression: true})) + ")");
		};
		
		if (wrap) {
			// we set the cachevar inside
			// p "special caching for call"
			if (this._cache) {
				this._cache.manual = true;
				out = ("(" + (this.cachevar().c()) + "=" + out + ")");
			};
			
			out = [wrap[0],out,wrap[1]].join("");
		};
		
		return out;
	};
	
	
	
	
	
	function ImplicitCall(){ Call.apply(this,arguments) };
	
	subclass$(ImplicitCall,Call);
	exports.ImplicitCall = ImplicitCall; // export class 
	ImplicitCall.prototype.js = function (o){
		return "" + (this.callee().c()) + "()";
	};
	
	
	function New(){ Call.apply(this,arguments) };
	
	subclass$(New,Call);
	exports.New = New; // export class 
	New.prototype.js = function (o){
		// 
		var out = ("new " + (this.callee().c()));
		if (!((o.parent() instanceof Call))) { out += '()' };
		return out;
	};
	
	
	function SuperCall(){ Call.apply(this,arguments) };
	
	subclass$(SuperCall,Call);
	exports.SuperCall = SuperCall; // export class 
	SuperCall.prototype.js = function (o){
		var m = o.method();
		this.setReceiver(SELF);
		this.setCallee(("" + (m.target().c()) + ".super$.prototype." + (m.name().c())));
		return SuperCall.__super__.js.apply(this,arguments);
	};
	
	
	
	
	function ExternDeclaration(){ ListNode.apply(this,arguments) };
	
	subclass$(ExternDeclaration,ListNode);
	exports.ExternDeclaration = ExternDeclaration; // export class 
	ExternDeclaration.prototype.visit = function (){
		// p "visiting externdeclaration"
		this.setNodes(this.map(function(item) {
			return item.node();
		})); // drop var or access really
		// only in global scope?
		var root = this.scope__();
		for (var i=0, ary=iter$(this.nodes()), len=ary.length, item; i < len; i++) {
			item = ary[i];var variable = root.register(item.symbol(),item,{type: 'global'});
			variable.addReference(item);
		};
		return this;
	};
	
	ExternDeclaration.prototype.c = function (){
		return "// externs";
	};
	
	
	
	// FLOW
	
	function ControlFlow(){ Node.apply(this,arguments) };
	
	subclass$(ControlFlow,Node);
	exports.ControlFlow = ControlFlow; // export class 
	
	
	
	
	function ControlFlowStatement(){ ControlFlow.apply(this,arguments) };
	
	subclass$(ControlFlowStatement,ControlFlow);
	exports.ControlFlowStatement = ControlFlowStatement; // export class 
	ControlFlowStatement.prototype.isExpressable = function (){
		return false;
	};
	
	
	
	
	function If(cond,body,o){
		if(o === undefined) o = {};
		this.setup();
		this._test = cond; // (o:type == 'unless' ? UnaryOp.new('!',cond,null) : cond)
		this._body = body;
		this._alt = null;
		this._type = o.type;
		if (this._type == 'unless') this.invert();
		this._scope = new IfScope(this);
		this;
	};
	
	subclass$(If,ControlFlow);
	exports.If = If; // export class 
	
	If.prototype.__test = {name: 'test'};
	If.prototype.test = function(v){ return this._test; }
	If.prototype.setTest = function(v){ this._test = v; return this; };
	
	If.prototype.__body = {name: 'body'};
	If.prototype.body = function(v){ return this._body; }
	If.prototype.setBody = function(v){ this._body = v; return this; };
	
	If.prototype.__alt = {name: 'alt'};
	If.prototype.alt = function(v){ return this._alt; }
	If.prototype.setAlt = function(v){ this._alt = v; return this; };
	
	If.prototype.__scope = {name: 'scope'};
	If.prototype.scope = function(v){ return this._scope; }
	If.prototype.setScope = function(v){ this._scope = v; return this; };
	
	If.ternary = function (cond,body,alt){
		// prefer to compile it this way as well
		var obj = new If(cond,new Block([body]),{type: '?'});
		obj.addElse(new Block([alt]));
		return obj;
	};
	
	If.prototype.addElse = function (add){
		// p "add else!",add
		if (this.alt() && (this.alt() instanceof If)) {
			// p 'add to the inner else(!)',add
			this.alt().addElse(add);
		} else {
			this.setAlt(add);
		};
		return this;
	};
	
	
	If.prototype.invert = function (){
		if (this._test instanceof ComparisonOp) {
			return this._test = this._test.invert();
		} else {
			return this._test = new UnaryOp('!',this._test,null);
		};
	};
	
	If.prototype.visit = function (){
		var alt = this.alt();
		
		if (this._scope) { this._scope.visit() };
		if (this.test()) { this.test().traverse() };
		if (this.body()) { this.body().traverse() };
		
		// should skip the scope in alt.
		if (alt) {
			// p "scoping {STACK.scopes:length}"
			STACK.pop(this);
			alt._scope || (alt._scope = new BlockScope(alt));
			alt.traverse();
			STACK.push(this);
			
			// if alt isa If
			// 	# alt.@scope.visit if alt.@scope
			// 	true
			// else
			// 	
			// 	p "else-block isa {alt}"
			
			// popping ourselves from stack while we
			// traverse the alternate route
		};
		
		// force it as expression?
		if (this._type == '?' && this.isExpressable()) this.toExpression();
		return this;
	};
	
	
	If.prototype.js = function (o){
		var body = this.body();
		// would possibly want to look up / out 
		var brace = {braces: true,indent: true};
		
		var cond = this.test().c({expression: true}); // the condition is always an expression
		
		if (o.isExpression()) {
			var code = body.c(); // (braces: yes)
			code = '(' + code + ')'; // if code.indexOf(',') >= 0
			// is expression!
			if (this.alt()) {
				// console.log "type of ternary {test}"
				// be safe - wrap condition as well
				// ask for parens
				return ("" + cond + " ? " + code + " : (" + (this.alt().c()) + ")");
			} else {
				// again - we need a better way to decide what needs parens
				// maybe better if we rewrite this to an OP('&&'), and put
				// the parens logic there
				// cond should possibly have parens - but where do we decide?
				return ("(" + cond + ") && " + code);
			};
		} else {
			// if there is only a single item - and it is an expression?
			code = null;
			// if body.count == 1 # dont indent by ourselves?
			
			if ((body instanceof Block) && body.count() == 1) {
				body = body.first();
			};
			
			// if body.count == 1
			//	p "one item only!"
			//	body = body.first
			
			code = body.c({braces: true}); // (braces: yes)
			// don't wrap if it is only a single expression?
			var out = ("if (" + cond + ") ") + code; // ' {' + code + '}' # '{' + code + '}'
			if (this.alt()) { out += (" else " + (this.alt().c(this.alt() instanceof If ? ({}) : (brace)))) };
			return out;
		};
	};
	
	
	If.prototype.consume = function (node){
		// p 'assignify if?!'
		// if it is possible, convert into expression
		if (node instanceof TagTree) {
			this._body = this._body.consume(node);
			if (this._alt) { this._alt = this._alt.consume(node) };
			return this;
		};
		
		// special case for If created from conditional assign as well?
		// @type == '?' and 
		// ideally we dont really want to make any expression like this by default
		var isRet = (node instanceof Return);
		
		// might have been forced to expression already
		// if it was originally a ternary - why not
		if (this._expression || ((!isRet || this._type == '?') && this.isExpressable())) {
			this.toExpression(); // mark as expression(!) - is this needed?
			return If.__super__.consume.call(this,node);
		} else {
			this._body = this._body.consume(node);
			if (this._alt) { this._alt = this._alt.consume(node) };
		};
		return this;
	};
	
	
	If.prototype.isExpressable = function (){
		// process:stdout.write 'x'
		var exp = this.body().isExpressable() && (!this.alt() || this.alt().isExpressable());
		return exp;
	};
	
	
	
	
	function Loop(options){
		if(options === undefined) options = {};
		this._traversed = false;
		this._options = options;
		this._body = null;
		this;
	};
	
	
	subclass$(Loop,Statement);
	exports.Loop = Loop; // export class 
	
	Loop.prototype.__scope = {name: 'scope'};
	Loop.prototype.scope = function(v){ return this._scope; }
	Loop.prototype.setScope = function(v){ this._scope = v; return this; };
	
	Loop.prototype.__options = {name: 'options'};
	Loop.prototype.options = function(v){ return this._options; }
	Loop.prototype.setOptions = function(v){ this._options = v; return this; };
	
	Loop.prototype.__body = {name: 'body'};
	Loop.prototype.body = function(v){ return this._body; }
	Loop.prototype.setBody = function(v){ this._body = v; return this; };
	
	Loop.prototype.__catcher = {name: 'catcher'};
	Loop.prototype.catcher = function(v){ return this._catcher; }
	Loop.prototype.setCatcher = function(v){ this._catcher = v; return this; };
	
	
	Loop.prototype.set = function (obj){
		// p "configure for!"
		this._options || (this._options = {});
		var keys = Object.keys(obj);
		for (var i=0, ary=iter$(keys), len=ary.length, k; i < len; i++) {
			k = ary[i];this._options[k] = obj[k];
		};
		return this;
	};
	
	
	Loop.prototype.addBody = function (body){
		this.setBody(blk__(body));
		return this;
	};
	
	
	Loop.prototype.c = function (o){
		
		var s = this.stack();
		var curr = s.current();
		// p "Loop.c - {isExpressable} {stack} {stack.isExpression}"
		// p "stack is expression? {o} {isExpression}"
		
		
		
		if (this.stack().isExpression() || this.isExpression()) {
			// p "the stack is an expression for loop now(!)"
			// what the inner one should not be an expression though?
			// this will resut in an infinite loop, no?!?
			var ast = CALL(FN([],[this]),[]);
			return ast.c(o);
		} else if ((this.stack().current() instanceof Block) || ((s.up() instanceof Block) && s.current()._consumer == this)) {
			
			// p "what is the current stack of loop? {stack.current}"
			return Loop.__super__.c.call(this,o);
		} else {
			// p "Should never get here?!?"
			ast = CALL(FN([],[this]),[]);
			return ast.c(o);
			// need to wrap in function
		};
	};
	
	
	
	
	function While(test,opts){
		this._traversed = false;
		this._test = test;
		this._options = opts || {};
		this._scope = new WhileScope(this);
		// set(opts) if opts
		// p "invert test for while? {@test}"
		if (this.option('invert')) {
			// "invert test for while {@test}"
			this._test = test.invert();
		};
		// invert the test
	};
	
	
	subclass$(While,Loop);
	exports.While = While; // export class 
	
	While.prototype.__test = {name: 'test'};
	While.prototype.test = function(v){ return this._test; }
	While.prototype.setTest = function(v){ this._test = v; return this; };
	
	
	While.prototype.visit = function (){
		this.scope().visit();
		if (this.test()) { this.test().traverse() };
		if (this.body()) { return this.body().traverse() };
	};
	
	
	// TODO BUG -- when we declare a var like: while var y = ...
	// the variable will be declared in the WhileScope which never
	// force-declares the inner variables in the scope
	
	While.prototype.consume = function (node){
		// p "While.consume {node}".cyan
		// This is never expressable, but at some point
		// we might want to wrap it in a function (like CS)
		if (this.isExpressable()) { return While.__super__.consume.apply(this,arguments) };
		
		if (node instanceof TagTree) {
			// WARN this is a hack to allow references coming through the wrapping scope 
			// will result in unneeded self-declarations and other oddities
			this.scope().context().reference();
			return CALL(FN([],[this]),[]);
		};
		
		var reuse = false;
		// WARN Optimization - might have untended side-effects
		// if we are assigning directly to a local variable, we simply
		// use said variable for the inner res
		// if reuse
		// 	resvar = scope.declare(node.left.node.variable,Arr.new([]),proxy: yes)
		// 	node = null
		// 	p "consume variable declarator!?".cyan
		// else
		// declare the variable we will use to soak up results
		// p "Creating value to store the result of loop".cyan
		// TODO Use a special vartype for this?
		var resvar = this.scope().declare('res',new Arr([]),{system: true});
		// WHAT -- fix this --
		this._catcher = new PushAssign("push",resvar,null); // the value is not preset # what
		this.body().consume(this._catcher); // should still return the same body
		
		// scope vars must not be compiled before this -- this is important
		var ast = new Block([this,resvar.accessor()]); // should be varaccess instead?
		return ast.consume(node);
		// NOTE Here we can find a way to know wheter or not we even need to 
		// return the resvar. Often it will not be needed
		// FIXME what happens if there is no node?!?
	};
	
	
	While.prototype.js = function (o){
		var out = ("while (" + (this.test().c({expression: true})) + ")") + this.body().c({braces: true,indent: true}); // .wrap
		
		if (this.scope().vars().count() > 0) {
			// p "while-block has declared variables(!)"
			return [this.scope().vars().c(),out];
		};
		return out;
	};
	
	
	
	
	// This should define an open scope
	// should rather 
	function For(o){
		if(o === undefined) o = {};
		this._traversed = false;
		this._options = o;
		this._scope = new ForScope(this);
		this._catcher = null;
	};
	
	subclass$(For,Loop);
	exports.For = For; // export class 
	For.prototype.visit = function (){
		this.scope().visit();
		this.options().source.traverse(); // what about awakening the vars here?
		this.declare();
		// should be able to toggle whether to keep the results here already(!)
		return this.body().traverse();
	};
	
	For.prototype.isBare = function (src){
		return src && src._variable && src._variable._isArray;
	};
	
	For.prototype.declare = function (){
		var o = this.options();
		var scope = this.scope();
		var src = o.source;
		var vars = o.vars = {};
		var oi = o.index;
		
		var bare = this.isBare(src);
		// p "source is a {src} - {bare}"
		// var i = vars:index = oi ? scope.declare(oi,0) : util.counter(0,yes).predeclare
		
		// what about a range where we also include an index?
		if (src instanceof Range) {
			// p "range for-loop"
			
			// really? declare? 
			// are we sure? _really_?
			vars.len = scope.declare('len',src.right()); // util.len(o,yes).predeclare
			// make the scope be the declarator
			vars.index = scope.register(o.name,scope,{type: 'let',declared: true});
			// p "registered {vars:index:constructor}"
			// p "index-var is declareod?!?! {vars:index.@declared}"
			scope.vars().push(vars.index.assignment(src.left()));
			// scope.declare(options:name,src.left)
			vars.value = vars.index;
		} else {
			// vars:value = scope.declare(options:name,null,let: yes)
			// we are using automatic caching far too much here
			
			// we should simply change how declare works
			var i = vars.index = oi ? (scope.declare(oi,0,{type: 'let'})) : (this.util().counter(0,true,scope).predeclare());
			
			vars.source = bare ? (src) : (this.util().iterable(src,true).predeclare());
			vars.len = this.util().len(vars.source,true).predeclare();
			
			vars.value = scope.declare(o.name,null,{type: 'let'});
			vars.value.addReference(o.name); // adding reference!
			if (oi) { i.addReference(oi) };
		};
		
		return this;
	};
	
	
	For.prototype.consume = function (node){
		// p "Loop consume? {node} - {isExpressable}"
		// if node isa ImplicitReturn
		// 	return self
		
		// p "For.consume {node}".cyan
		var receiver;
		if (this.isExpressable()) { return For.__super__.consume.apply(this,arguments) };
		
		// other cases as well, no?
		if (node instanceof TagTree) {
			// WARN this is a hack to allow references coming through the wrapping scope 
			// will result in unneeded self-declarations and other oddities
			// scope.parent.context.reference
			this.scope().context().reference();
			return CALL(new Lambda([],[this]),[]);
		};
		
		
		if (this._resvar) {
			this.p(("already have a resvar -- change consume? " + node));
			var ast = new Block([this,BR,this._resvar.accessor()]);
			ast.consume(node);
			return ast;
		};
		
		// if node isa return -- do something else
		
		var resvar = null;
		var reuseable = false; // node isa Assign && node.left.node isa LocalVarAccess
		var assignee = null;
		// might only work for locals?
		if (node instanceof Assign) {
			if (receiver = node.left()) {
				assignee = receiver._variable;
				if (receiver._variable) {
					// assignee
					reuseable = true;
				};
			};
		};
		
		// p "reusable?!?! {node} {node}"
		
		// WARN Optimization - might have untended side-effects
		// if we are assigning directly to a local variable, we simply
		// use said variable for the inner res
		if (reuseable && assignee) {
			// instead of declaring it in the scope - why not declare it outside?
			// it might already exist in the outer scope no?
			// p "reuseable {assignee} {scope} {scope.parent.lookup(assignee)}"
			// assignee.resolve
			// should probably instead alter the assign-node to set value to a blank array
			// resvar = scope.parent.declare(assignee,Arr.new([]),proxy: yes,pos: 0)
			
			// this variable should really not be redeclared inside here at all
			assignee.resolve();
			// resvar = @resvar = scope.declare(assignee,Arr.new([]),proxy: yes)
			
			// dont declare it - simply push an assign into the vardecl of scope
			this.scope().vars().unshift(OP('=',assignee,new Arr([])));
			resvar = this._resvar = assignee;
			
			node._consumer = this;
			node = null;
			
			// p "consume variable declarator!?".cyan
		} else {
			// declare the variable we will use to soak up results
			// p "Creating value to store the result of loop".cyan
			// what about a pool here?
			resvar = this._resvar = this.scope().declare('res',new Arr([]),{system: true});
		};
		
		this._catcher = new PushAssign("push",resvar,null); // the value is not preset
		this.body().consume(this._catcher); // should still return the same body
		
		
		
		if (node) {
			// p "returning new ast where Loop is first"
			ast = new Block([this,BR,resvar.accessor().consume(node)]);
			return ast;
		};
		// var ast = Block.new([self,BR,resvar.accessor])
		// ast.consume(node) if node
		// return ast
		// p "Loop did consume successfully"
		return this;
		
		// this is never an expression (for now -- but still)
		// return ast
	};
	
	
	For.prototype.js = function (o){
		var v_;
		var vars = this.options().vars;
		var i = vars.index;
		var val = vars.value;
		var cond = OP('<',i,vars.len);
		var src = this.options().source;
		
		// p "references for value",val.references:length
		
		var final = this.options().step ? (
			OP('=',i,OP('+',i,this.options().step))
		) : (
			OP('++',i)
		);
		
		// if there are few references to the value - we can drop
		// the actual variable and instead make it proxy through the index
		if (src instanceof Range) {
			if (src.inclusive()) { (cond.setOp(v_='<='),v_) };
		} else if (val.refcount() < 3 && val.assignments().length == 0) {
			// p "proxy the value {val.assignments:length}"
			// p "should proxy value-variable instead"
			val.proxy(vars.source,i);
		} else {
			this.body().unshift(OP('=',val,OP('.',vars.source,i)));
			// body.unshift(head)
			// TODO check lengths - intelligently decide whether to brace and indent
		};
		var head = ("for (" + (this.scope().vars().c()) + "; " + (cond.c()) + "; " + (final.c()) + ") ");
		return head + this.body().c({braces: true,indent: true}); // .wrap
	};
	
	
	For.prototype.head = function (){
		var vars = this.options().vars;
		return OP('=',vars.value,OP('.',vars.source,vars.index));
	};
	
	
	
	
	function ForIn(){ For.apply(this,arguments) };
	
	subclass$(ForIn,For);
	exports.ForIn = ForIn; // export class 
	
	
	
	
	function ForOf(){ For.apply(this,arguments) };
	
	subclass$(ForOf,For);
	exports.ForOf = ForOf; // export class 
	ForOf.prototype.declare = function (){
		var o = this.options();
		var vars = o.vars = {};
		
		// see if 
		
		// p "ForOf source isa {o:source}"
		
		// if o:source is a variable -- refer directly # variable? is this the issue?
		// p scope.@varmap['o'], scope.parent.@varmap['o']
		
		var src = vars.source = o.source._variable || this.scope().declare('o',o.source,{system: true,type: 'let'});
		if (o.index) { var v = vars.value = this.scope().declare(o.index,null,{let: true}) };
		
		// p "ForOf o:index {o:index} o:name {o:name}"
		// if o:index
		
		// possibly proxy the index-variable?
		
		if (o.own) {
			var i = vars.index = this.scope().declare('i',0,{system: true,type: 'let'}); // mark as a counter?
			// systemvariable -- should not really be added to the map
			var keys = vars.keys = this.scope().declare('keys',Util.keys(src.accessor()),{system: true,type: 'let'}); // the outer one should resolve first
			var l = vars.len = this.scope().declare('l',Util.len(keys.accessor()),{system: true,type: 'let'});
			var k = vars.key = this.scope().register(o.name,o.name,{type: 'let'}); // scope.declare(o:name,null,system: yes)
		} else {
			// we set the var -- why even declare it
			// no need to declare -- it will declare itself in the loop - no?
			k = vars.key = this.scope().register(o.name,o.name,{type: 'let'});
		};
		
		// TODO use util - why add references already? Ah -- this is for the highlighting
		if (v && o.index) { v.addReference(o.index) };
		if (k && o.name) { k.addReference(o.name) };
		
		return this;
	};
	
	ForOf.prototype.js = function (o){
		var vars = this.options().vars;
		
		var o = vars.source;
		var k = vars.key;
		var v = vars.value;
		var i = vars.index;
		
		
		if (v) {
			// set value as proxy of object[key]
			// possibly make it a ref? what is happening?
			v.refcount() < 3 ? (v.proxy(o,k)) : (this.body().unshift(OP('=',v,OP('.',o,k))));
		};
		
		if (this.options().own) {
			
			if (k.refcount() < 3) { // should probably adjust these
				k.proxy(vars.keys,i);
			} else {
				this.body().unshift(OP('=',k,OP('.',vars.keys,i)));
			};
			
			var head = ("for (" + (this.scope().vars().c()) + "; " + (OP('<',i,vars.len).c()) + "; " + (OP('++',i).c()) + ")");
			return head + this.body().c({indent: true,braces: true}); // .wrap
		};
		
		var code = this.body().c({braces: true,indent: true});
		// it is really important that this is a treated as a statement
		return this.scope().vars().c() + (";\nfor (var " + (k.c()) + " in " + (o.c()) + ")") + code;
	};
	
	ForOf.prototype.head = function (){
		var v = this.options().vars;
		
		return [
			OP('=',v.key,OP('.',v.keys,v.index)),
			(v.value) && (OP('=',v.value,OP('.',v.source,v.key)))
		];
	};
	
	
	// NO NEED?
	function Begin(body){
		this._nodes = blk__(body).nodes();
	};
	
	
	subclass$(Begin,Block);
	exports.Begin = Begin; // export class 
	Begin.prototype.shouldParenthesize = function (){
		return this.isExpression();
	};
	
	
	
	
	function Switch(a,b,c){
		this._traversed = false;
		this._source = a;
		this._cases = b;
		this._fallback = c;
	};
	
	
	subclass$(Switch,ControlFlowStatement);
	exports.Switch = Switch; // export class 
	
	Switch.prototype.__source = {name: 'source'};
	Switch.prototype.source = function(v){ return this._source; }
	Switch.prototype.setSource = function(v){ this._source = v; return this; };
	
	Switch.prototype.__cases = {name: 'cases'};
	Switch.prototype.cases = function(v){ return this._cases; }
	Switch.prototype.setCases = function(v){ this._cases = v; return this; };
	
	Switch.prototype.__fallback = {name: 'fallback'};
	Switch.prototype.fallback = function(v){ return this._fallback; }
	Switch.prototype.setFallback = function(v){ this._fallback = v; return this; };
	
	
	Switch.prototype.visit = function (){
		for (var i=0, ary=iter$(this.cases()), len=ary.length; i < len; i++) {
			ary[i].traverse();
		};
		if (this.fallback()) { this.fallback().visit() };
		if (this.source()) { this.source().visit() };
		return;
	};
	
	
	Switch.prototype.consume = function (node){
		this._cases = this._cases.map(function(item) {
			return item.consume(node);
		});
		if (this._fallback) { this._fallback = this._fallback.consume(node) };
		return this;
	};
	
	
	Switch.prototype.js = function (o){
		var body = [];
		
		for (var i=0, ary=iter$(this.cases()), len=ary.length, part; i < len; i++) {
			part = ary[i];part.autobreak();
			body.push(part);
		};
		
		if (this.fallback()) {
			body.push("default:\n" + this.fallback().c({indent: true}));
		};
		
		return ("switch (" + (this.source().c()) + ") ") + helpers.bracketize(cary__(body).join("\n"),true);
	};
	
	
	
	
	function SwitchCase(test,body){
		this._traversed = false;
		this._test = test;
		this._body = blk__(body);
	};
	
	subclass$(SwitchCase,ControlFlowStatement);
	exports.SwitchCase = SwitchCase; // export class 
	
	SwitchCase.prototype.__test = {name: 'test'};
	SwitchCase.prototype.test = function(v){ return this._test; }
	SwitchCase.prototype.setTest = function(v){ this._test = v; return this; };
	
	SwitchCase.prototype.__body = {name: 'body'};
	SwitchCase.prototype.body = function(v){ return this._body; }
	SwitchCase.prototype.setBody = function(v){ this._body = v; return this; };
	
	
	SwitchCase.prototype.visit = function (){
		return this.body().traverse();
	};
	
	
	SwitchCase.prototype.consume = function (node){
		this.body().consume(node);
		return this;
	};
	
	
	SwitchCase.prototype.autobreak = function (){
		if (!((this.body().last() instanceof BreakStatement))) { this.body().push(new BreakStatement()) };
		return this;
	};
	
	
	SwitchCase.prototype.js = function (o){
		if (!((this._test instanceof Array))) { this._test = [this._test] };
		var cases = this._test.map(function(item) {
			return "case " + (item.c()) + ":";
		});
		return cases.join("\n") + this.body().c({indent: true}); // .indent
	};
	
	
	
	
	function Try(body,c,f){
		this._traversed = false;
		this._body = blk__(body);
		this._catch = c;
		this._finally = f;
	};
	
	
	subclass$(Try,ControlFlowStatement);
	exports.Try = Try; // export class 
	
	Try.prototype.__body = {name: 'body'};
	Try.prototype.body = function(v){ return this._body; }
	Try.prototype.setBody = function(v){ this._body = v; return this; };
	// prop ncatch
	// prop nfinally
	
	Try.prototype.consume = function (node){
		this._body = this._body.consume(node);
		if (this._catch) { this._catch = this._catch.consume(node) };
		if (this._finally) { this._finally = this._finally.consume(node) };
		return this;
	};
	
	
	Try.prototype.visit = function (){
		this._body.traverse();
		if (this._catch) { this._catch.traverse() };
		if (this._finally) { return this._finally.traverse() };
		// no blocks - add an empty catch
	};
	
	
	Try.prototype.js = function (o){
		var out = "try " + this.body().c({braces: true,indent: true});
		if (this._catch) { out += " " + this._catch.c() };
		if (this._finally) { out += " " + this._finally.c() };
		
		if (!(this._catch || this._finally)) {
			out += " catch (e) \{ \}";
		};
		out += ";";
		return out;
	};
	
	
	
	
	function Catch(body,varname){
		this._traversed = false;
		this._body = blk__(body || []);
		this._scope = new CatchScope(this);
		this._varname = varname;
		this;
	};
	
	subclass$(Catch,ControlFlowStatement);
	exports.Catch = Catch; // export class 
	
	Catch.prototype.__body = {name: 'body'};
	Catch.prototype.body = function(v){ return this._body; }
	Catch.prototype.setBody = function(v){ this._body = v; return this; };
	
	Catch.prototype.consume = function (node){
		this._body = this._body.consume(node);
		return this;
	};
	
	
	Catch.prototype.visit = function (){
		this._scope.visit();
		this._variable = this._scope.register(this._varname,this,{pool: 'catchvar'});
		return this._body.traverse();
	};
	
	
	Catch.prototype.js = function (o){
		// only indent if indented by default?
		return ("catch (" + (this._variable.c()) + ") ") + this._body.c({braces: true,indent: true});
	};
	
	
	
	// repeating myself.. don't deal with it until we move to compact tuple-args
	// for all astnodes
	
	
	function Finally(body){
		this._traversed = false;
		this._body = blk__(body || []);
	};
	
	
	subclass$(Finally,ControlFlowStatement);
	exports.Finally = Finally; // export class 
	Finally.prototype.visit = function (){
		return this._body.traverse();
	};
	
	
	Finally.prototype.consume = function (node){
		// swallow silently
		return this;
	};
	
	
	Finally.prototype.js = function (o){
		return "finally " + this._body.c({braces: true,indent: true});
	};
	
	
	
	// RANGE
	
	function Range(){ Op.apply(this,arguments) };
	
	subclass$(Range,Op);
	exports.Range = Range; // export class 
	Range.prototype.inclusive = function (){
		return this.op() == '..';
	};
	
	Range.prototype.c = function (){
		return "range";
	};
	
	
	
	function Splat(){ ValueNode.apply(this,arguments) };
	
	subclass$(Splat,ValueNode);
	exports.Splat = Splat; // export class 
	Splat.prototype.js = function (o){
		var par = this.stack().parent();
		if ((par instanceof ArgList) || (par instanceof Arr)) {
			return "[].slice.call(" + (this.value().c()) + ")";
		} else {
			this.p(("what is the parent? " + par));
			return "SPLAT";
		};
	};
	
	Splat.prototype.node = function (){
		return this.value();
	};
	
	
	
	
	
	
	// TAGS
	
	
	TAG_TYPES = {};
	TAG_ATTRS = {};
	
	
	TAG_TYPES.HTML = "a abbr address area article aside audio b base bdi bdo big blockquote body br button canvas caption cite code col colgroup data datalist dd del details dfn div dl dt em embed fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 head header hr html i iframe img input ins kbd keygen label legend li link main map mark menu menuitem meta meter nav noscript object ol optgroup option output p param pre progress q rp rt ruby s samp script section select small source span strong style sub summary sup table tbody td textarea tfoot th thead time title tr track u ul var video wbr".split(" ");
	
	TAG_TYPES.SVG = "circle defs ellipse g line linearGradient mask path pattern polygon polyline radialGradient rect stop svg text tspan".split(" ");
	
	TAG_ATTRS.HTML = "accept accessKey action allowFullScreen allowTransparency alt async autoComplete autoFocus autoPlay cellPadding cellSpacing charSet checked className cols colSpan content contentEditable contextMenu controls coords crossOrigin data dateTime defer dir disabled download draggable encType form formNoValidate frameBorder height hidden href hrefLang htmlFor httpEquiv icon id label lang list loop max maxLength mediaGroup method min multiple muted name noValidate pattern placeholder poster preload radioGroup readOnly rel required role rows rowSpan sandbox scope scrollLeft scrolling scrollTop seamless selected shape size span spellCheck src srcDoc srcSet start step style tabIndex target title type useMap value width wmode";
	
	TAG_ATTRS.SVG = "cx cy d dx dy fill fillOpacity fontFamily fontSize fx fy gradientTransform gradientUnits markerEnd markerMid markerStart offset opacity patternContentUnits patternUnits points preserveAspectRatio r rx ry spreadMethod stopColor stopOpacity stroke strokeDasharray strokeLinecap strokeOpacity strokeWidth textAnchor transform version viewBox x1 x2 x y1 y2 y";
	
	
	function TagDesc(){
		this.p('TagDesc!!!',arguments);
		this;
	};
	
	subclass$(TagDesc,Node);
	exports.TagDesc = TagDesc; // export class 
	TagDesc.prototype.classes = function (){
		this.p('TagDescClasses',arguments);
		return this;
	};
	
	
	function Tag(o){
		if(o === undefined) o = {};
		this._traversed = false;
		this._parts = [];
		o.classes || (o.classes = []);
		o.attributes || (o.attributes = []);
		o.classes || (o.classes = []);
		this._options = o;
		this._reference = null;
		this._object = null;
		this._tree = null;
		this;
	};
	
	subclass$(Tag,Node);
	exports.Tag = Tag; // export class 
	
	Tag.prototype.__parts = {name: 'parts'};
	Tag.prototype.parts = function(v){ return this._parts; }
	Tag.prototype.setParts = function(v){ this._parts = v; return this; };
	
	Tag.prototype.__object = {name: 'object'};
	Tag.prototype.object = function(v){ return this._object; }
	Tag.prototype.setObject = function(v){ this._object = v; return this; };
	
	Tag.prototype.__reactive = {name: 'reactive'};
	Tag.prototype.reactive = function(v){ return this._reactive; }
	Tag.prototype.setReactive = function(v){ this._reactive = v; return this; };
	
	Tag.prototype.__parent = {name: 'parent'};
	Tag.prototype.parent = function(v){ return this._parent; }
	Tag.prototype.setParent = function(v){ this._parent = v; return this; };
	
	Tag.prototype.__tree = {name: 'tree'};
	Tag.prototype.tree = function(v){ return this._tree; }
	Tag.prototype.setTree = function(v){ this._tree = v; return this; };
	
	Tag.prototype.set = function (obj){
		for (var v, i=0, keys=Object.keys(obj), l=keys.length; i < l; i++){
			k = keys[i];v = obj[k];if (k == 'attributes') {
				// p "attributs!"
				for (var j=0, ary=iter$(v), len=ary.length; j < len; j++) {
					this.addAttribute(ary[j]);
				};
				continue;
			};
			
			this._options[k] = v;
		};
		return this;
	};
	
	Tag.prototype.addClass = function (node){
		if (!((node instanceof TagFlag))) {
			node = new TagFlag(node);
		};
		this._options.classes.push(node);
		this._parts.push(node);
		
		// p "add class!!!"
		return this;
	};
	
	Tag.prototype.addIndex = function (node){
		this._parts.push(node);
		this._object = node;
		return this;
	};
	
	Tag.prototype.addSymbol = function (node){
		// p "addSymbol to the tag",node
		if (this._parts.length == 0) {
			this._parts.push(node);
			this._options.ns = node;
		};
		return this;
	};
	
	
	Tag.prototype.addAttribute = function (atr){
		// p "add attribute!!!", key, value
		this._parts.push(atr); // what?
		this._options.attributes.push(atr);
		return this;
	};
	
	Tag.prototype.enclosing = function (){
		return this._options.close && this._options.close.value();
	};
	
	Tag.prototype.type = function (){
		return this._options.type || 'div';
	};
	
	Tag.prototype.consume = function (node){
		if (node instanceof TagTree) {
			// p "tag consume tagtree? {node.reactive}"
			this.setReactive(node.reactive() || !(!this.option('ivar')));
			this.setParent(node.root());
			return this;
		} else {
			return Tag.__super__.consume.apply(this,arguments);
		};
	};
	
	Tag.prototype.visit = function (){
		var o = this._options;
		var typ = this.enclosing();
		if (typ == '->' || typ == '=>') {
			// console.log "tag is template?!? {typ}"
			this._tree = new TagTree(o.body,{root: this,reactive: this.reactive()});
			o.body = new TagFragmentFunc([],Block.wrap([this._tree]));
			// console.log "made o body a function?"
		};
		
		if (o.body) {
			o.body.traverse();
		};
		
		// id should also be a regular part
		
		if (o.id) { o.id.traverse() };
		
		for (var i=0, ary=iter$(this._parts), len=ary.length; i < len; i++) {
			ary[i].traverse();
		};
		
		// for atr in @options:attributes
		// 	atr.traverse
		
		return this;
	};
	
	Tag.prototype.reference = function (){
		return this._reference || (this._reference = this.scope__().temporary(this,{pool: 'tag'}).resolve());
	};
	
	// should this not happen in js?
	// should this not happen in js?
	Tag.prototype.js = function (o){
		// p JSON.stringify(@options)
		// var attrs = TagAttributes.new(o:attributes)
		// p "got here?"
		var body;
		var o = this._options;
		var a = {};
		var enc = this.enclosing();
		
		var setup = [];
		var calls = [];
		var statics = [];
		
		var scope = this.scope__();
		var commit = "end";
		var content = o.body;
		
		var isSelf = (this.type() instanceof Self);
		var bodySetter = isSelf ? ("setChildren") : ("setContent");
		
		for (var i=0, ary=iter$(o.attributes), len=ary.length, atr; i < len; i++) {
			atr = ary[i];a[atr.key()] = atr.value(); // .populate(obj)
		};
		
		var quote = function(str) {
			return helpers.singlequote(str);
		};
		var id = o.id instanceof Node ? (o.id.c()) : ((o.id && quote(o.id.c())));
		var tree = this._tree || null;
		
		
		//  "scope is", !!scope
		// p "type is {type}"
		var out = isSelf ? (
			commit = "synced",
			// p "got here"
			// setting correct context directly
			this.setReactive(true),
			this._reference = scope.context(),
			
			scope.context().c()
		) : (o.id ? (
			("ti$('" + (this.type().func()) + "'," + id + ")")
		) : (
			("t$('" + (this.type().func()) + "')")
		));
		
		// this is reactive if it has an ivar
		if (o.ivar) {
			this.setReactive(true);
			statics.push((".setRef(" + (quote(o.ivar.name())) + "," + (scope.context().c()) + ")"));
		};
		
		if (o.body instanceof Func) {
			// console.log "o:body isa function!"
			bodySetter = "setTemplate";
		} else if (o.body) {
			tree = new TagTree(o.body,{root: this,reactive: this.reactive()});
			content = tree;
			this.setTree(tree);
		};
		
		if (tree) {
			tree.resolve();
		};
		
		for (var i=0, ary=iter$(this._parts), len=ary.length, part; i < len; i++) {
			part = ary[i];if (part instanceof TagAttr) {
				var akey = String(part.key());
				
				// the attr should compile itself instead -- really
				
				if (akey[0] == '.') { // should check in a better way
					calls.push((".flag(" + (quote(akey.substr(1))) + "," + (part.value().c()) + ")"));
				} else if (akey[0] == ':') {
					calls.push((".setHandler(" + (quote(akey.substr(1))) + "," + (part.value().c()) + ")"));
				} else {
					calls.push(("." + (helpers.setterSym(akey)) + "(" + (part.value().c()) + ")"));
				};
			} else if (part instanceof TagFlag) {
				calls.push(part.c());
			};
		};
		
		if (this.object()) {
			calls.push((".setObject(" + (this.object().c()) + ")"));
		};
		
		// p "tagtree is static? {tree.static}"
		
		// we need to trigger our own reference before the body does
		// but we do not need a reference if we have no body (no nodes will refer it)
		if (this.reactive() && tree && tree.hasTags()) {
			this.reference();
		};
		
		
		if (body = content && content.c({expression: true})) { // force it to be an expression, no?
			calls.push(("." + bodySetter + "(" + body + ")"));
			
			// out += ".body({body})"
		};
		
		// if o:attributes:length # or -- always?
		// adds lots of extra calls - but okay for now
		calls.push(("." + commit + "()"));
		
		if (statics.length) {
			out = out + statics.join("");
		};
		
		
		if ((o.ivar || this.reactive()) && !(this.type() instanceof Self)) {
			// if this is an ivar, we should set the reference relative
			// to the outer reference, or possibly right on context?
			var par = this.parent();
			var ctx = !(o.ivar) && par && par.reference() || scope.context();
			var key = o.ivar || par && par.tree().indexOf(this);
			
			// need the context -- might be better to rewrite it for real?
			// parse the whole thing into calls etc
			var acc = OP('.',ctx,key).c();
			
			if (this._reference) {
				out = ("(" + (this.reference().c()) + " = " + acc + " || (" + acc + " = " + out + "))");
			} else {
				out = ("(" + acc + " = " + acc + " || " + out + ")");
			};
		};
		
		
		// should we not add references to the outer ones first?
		
		// now work on the refereces?
		
		// free variable
		if (this._reference instanceof Variable) { this._reference.free() };
		// if setup:length
		//	out += ".setup({setup.join(",")})"
		
		return out + calls.join("");
	};
	
	
	// This is a helper-node
	// Should probably use the same type of listnode everywhere - and simply flag the type as TagTree instead
	function TagTree(list,options){
		if(options === undefined) options = {};
		this._nodes = this.load(list);
		this._options = options;
		this;
	};
	
	subclass$(TagTree,ListNode);
	exports.TagTree = TagTree; // export class 
	TagTree.prototype.load = function (list){
		if (list instanceof ListNode) {
			// p "is a list node!! {list.count}"
			// we still want the indentation if we are not in a template
			// or, rather - we want the block to get the indentation - not the tree
			if (list.count() > 1) this._indentation || (this._indentation = list._indentation);
			return list.nodes();
		} else {
			return compact__(list instanceof Array ? (list) : ([list]));
		};
	};
	
	TagTree.prototype.root = function (){
		return this.option('root');
	};
	
	TagTree.prototype.reactive = function (){
		return this.option('reactive');
	};
	
	TagTree.prototype.resolve = function (){
		var self=this;
		this.remap(function(c) {
			return c.consume(self);
		});
		return self;
	};
	
	TagTree.prototype.static = function (){
		return this._static == null ? (this._static = this.every(function(c) {
			return c instanceof Tag;
		})) : (this._static);
	};
	
	TagTree.prototype.hasTags = function (){
		return this.some(function(c) {
			return c instanceof Tag;
		});
	};
	
	TagTree.prototype.c = function (o){
		// FIXME TEST what about comments???
		var single = this.count() == 1;
		var out = TagTree.__super__.c.call(this,o);
		if (!single) { out = "[" + out + "]" };
		return out;
	};
	
	
	function TagWrapper(){ ValueNode.apply(this,arguments) };
	
	subclass$(TagWrapper,ValueNode);
	exports.TagWrapper = TagWrapper; // export class 
	TagWrapper.prototype.visit = function (){
		if (this.value() instanceof Array) {
			this.value().map(function(v) {
				return v.traverse();
			});
		} else {
			this.value().traverse();
		};
		return this;
	};
	
	TagWrapper.prototype.c = function (){
		return "tag$wrap(" + (this.value().c({expression: true})) + ")";
	};
	
	
	
	function TagAttributes(){ ListNode.apply(this,arguments) };
	
	subclass$(TagAttributes,ListNode);
	exports.TagAttributes = TagAttributes; // export class 
	TagAttributes.prototype.get = function (name){
		for (var i=0, ary=iter$(this.nodes()), len=ary.length, node, res=[]; i < len; i++) {
			node = ary[i];if (node.key() == name) { return node };
		};
		return res;
	};
	
	
	
	function TagAttr(k,v){
		// p "init TagAttribute", $0
		this._traversed = false;
		this._key = k;
		this._value = v;
	};
	
	subclass$(TagAttr,Node);
	exports.TagAttr = TagAttr; // export class 
	
	TagAttr.prototype.__key = {name: 'key'};
	TagAttr.prototype.key = function(v){ return this._key; }
	TagAttr.prototype.setKey = function(v){ this._key = v; return this; };
	
	TagAttr.prototype.__value = {name: 'value'};
	TagAttr.prototype.value = function(v){ return this._value; }
	TagAttr.prototype.setValue = function(v){ this._value = v; return this; };
	
	TagAttr.prototype.visit = function (){
		if (this.value()) { this.value().traverse() };
		return this;
	};
	
	TagAttr.prototype.populate = function (obj){
		obj.add(this.key(),this.value());
		return this;
	};
	
	TagAttr.prototype.c = function (){
		return "attribute";
	};
	
	
	
	function TagFlag(value){
		this._traversed = false;
		this._value = value;
		this;
	};
	
	subclass$(TagFlag,Node);
	exports.TagFlag = TagFlag; // export class 
	
	TagFlag.prototype.__value = {name: 'value'};
	TagFlag.prototype.value = function(v){ return this._value; }
	TagFlag.prototype.setValue = function(v){ this._value = v; return this; };
	
	TagFlag.prototype.__toggler = {name: 'toggler'};
	TagFlag.prototype.toggler = function(v){ return this._toggler; }
	TagFlag.prototype.setToggler = function(v){ this._toggler = v; return this; };
	
	TagFlag.prototype.visit = function (){
		if (!((typeof this._value=='string'||this._value instanceof String))) {
			this._value.traverse();
		};
		return this;
	};
	
	TagFlag.prototype.c = function (){
		if (this.value() instanceof Node) {
			return ".flag(" + (this.value().c()) + ")";
		} else {
			return ".flag(" + (helpers.singlequote(this.value())) + ")";
		};
	};
	
	
	
	
	
	
	
	// SELECTORS
	
	
	function Selector(list,options){
		this._nodes = list || [];
		this._options = options;
	};
	
	subclass$(Selector,ListNode);
	exports.Selector = Selector; // export class 
	Selector.prototype.add = function (part,typ){
		// p "select add!",part,typ
		// mark if special?
		this.push(part);
		return this;
	};
	
	Selector.prototype.group = function (){
		// console.log "grouped!"
		// for now we simply add a comma
		// how would this work for dst?
		this._nodes.push(new SelectorGroup(","));
		return this;
	};
	
	Selector.prototype.query = function (){
		var str = "";
		var ary = [];
		
		for (var i=0, items=iter$(this.nodes()), len=items.length; i < len; i++) {
			var val = items[i].c();
			if ((typeof val=='string'||val instanceof String)) {
				str = ("" + str + val);
			};
		};
		
		return "'" + str + "'";
	};
	
	
	Selector.prototype.js = function (o){
		var typ = this.option('type');
		var q = c__(this.query());
		
		if (typ == '%') {
			return "q$(" + q + "," + (o.scope().context().c({explicit: true})) + ")"; // explicit context
		} else if (typ == '%%') {
			return "q$$(" + q + "," + (o.scope().context().c({explicit: true})) + ")";
		} else {
			return "q" + typ + "(" + q + ")";
		};
		
		// return "{typ} {scoped} - {all}"
	};
	
	
	
	function SelectorPart(){ ValueNode.apply(this,arguments) };
	
	subclass$(SelectorPart,ValueNode);
	exports.SelectorPart = SelectorPart; // export class 
	SelectorPart.prototype.c = function (){
		return c__(this._value);
		// "{value.c}"
	};
	
	
	function SelectorGroup(){ SelectorPart.apply(this,arguments) };
	
	subclass$(SelectorGroup,SelectorPart);
	exports.SelectorGroup = SelectorGroup; // export class 
	SelectorGroup.prototype.c = function (){
		return ",";
	};
	
	
	function SelectorType(){ SelectorPart.apply(this,arguments) };
	
	subclass$(SelectorType,SelectorPart);
	exports.SelectorType = SelectorType; // export class 
	SelectorType.prototype.c = function (){
		// support
		// p "selectortype {value}"
		// var out = value.c
		var name = this.value().name();
		
		// at least be very conservative about which tags we
		// can drop the tag for?
		// out in TAG_TYPES.HTML ? 
		return idx$(name,TAG_TYPES.HTML) >= 0 ? (name) : (this.value().sel());
	};
	
	
	
	function SelectorUniversal(){ SelectorPart.apply(this,arguments) };
	
	subclass$(SelectorUniversal,SelectorPart);
	exports.SelectorUniversal = SelectorUniversal; // export class 
	
	
	function SelectorNamespace(){ SelectorPart.apply(this,arguments) };
	
	subclass$(SelectorNamespace,SelectorPart);
	exports.SelectorNamespace = SelectorNamespace; // export class 
	
	
	function SelectorClass(){ SelectorPart.apply(this,arguments) };
	
	subclass$(SelectorClass,SelectorPart);
	exports.SelectorClass = SelectorClass; // export class 
	SelectorClass.prototype.c = function (){
		if (this._value instanceof Node) {
			return ".'+" + (this._value.c()) + "+'";
		} else {
			return "." + (c__(this._value));
		};
	};
	
	
	function SelectorId(){ SelectorPart.apply(this,arguments) };
	
	subclass$(SelectorId,SelectorPart);
	exports.SelectorId = SelectorId; // export class 
	SelectorId.prototype.c = function (){
		if (this._value instanceof Node) {
			return "#'+" + (this._value.c()) + "+'";
		} else {
			return "#" + (c__(this._value));
		};
	};
	
	
	function SelectorCombinator(){ SelectorPart.apply(this,arguments) };
	
	subclass$(SelectorCombinator,SelectorPart);
	exports.SelectorCombinator = SelectorCombinator; // export class 
	SelectorCombinator.prototype.c = function (){
		return "" + (c__(this._value));
	};
	
	
	function SelectorPseudoClass(){ SelectorPart.apply(this,arguments) };
	
	subclass$(SelectorPseudoClass,SelectorPart);
	exports.SelectorPseudoClass = SelectorPseudoClass; // export class 
	
	
	function SelectorAttribute(left,op,right){
		this._left = left;
		this._op = op;
		this._right = this._value = right;
	};
	
	subclass$(SelectorAttribute,SelectorPart);
	exports.SelectorAttribute = SelectorAttribute; // export class 
	SelectorAttribute.prototype.c = function (){
		// TODO possibly support .toSel or sel$(v) for items inside query
		// could easily do it with a helper-function that is added to the top of the filescope
		if (this._right instanceof Str) {
			return "[" + (this._left.c()) + this._op + (this._right.c()) + "]";
		} else if (this._right) {
			// this is not at all good
			return "[" + (this._left.c()) + this._op + "\"'+" + (c__(this._right)) + "+'\"]";
		} else {
			return "[" + (this._left.c()) + "]";
			
			// ...
		};
	};
	
	
	
	
	
	// DEFER
	
	function Await(){ ValueNode.apply(this,arguments) };
	
	subclass$(Await,ValueNode);
	exports.Await = Await; // export class 
	
	Await.prototype.__func = {name: 'func'};
	Await.prototype.func = function(v){ return this._func; }
	Await.prototype.setFunc = function(v){ this._func = v; return this; };
	
	Await.prototype.js = function (o){
		// introduce a util here, no?
		return CALL(OP('.',new Util.Promisify([this.value()]),'then'),[this.func()]).c();
		// value.c
	};
	
	Await.prototype.visit = function (o){
		// things are now traversed in a somewhat chaotic order. Need to tighten
		// Create await function - push this value up to block, take the outer
		var self=this;
		self.value().traverse();
		
		var block = o.up(Block); // or up to the closest FUNCTION?
		var outer = o.relative(block,1);
		var par = o.relative(self,-1);
		
		// p "Block {block} {outer} {par}"
		
		self.setFunc(new AsyncFunc([],[]));
		// now we move this node up to the block
		self.func().body().setNodes(block.defers(outer,self));
		
		// if the outer is a var-assignment, we can simply set the params
		if (par instanceof Assign) {
			par.left().traverse();
			var lft = par.left().node();
			// p "Async assignment {par} {lft}"
			// Can be a tuple as well, no?
			if (lft instanceof VarReference) {
				// the param is already registered?
				// should not force the name already??
				// beware of bugs
				self.func().params().at(0,true,lft.variable().name());
			} else if (lft instanceof Tuple) {
				// if this an unfancy tuple, with only vars
				// we can just use arguments
				
				if (par.type() == 'var' && !(lft.hasSplat())) {
					// p "SIMPLIFY! {lft.nodes[0]}"
					lft.map(function(el,i) {
						return self.func().params().at(i,true,el.value());
					});
				} else {
					// otherwise, do the whole tuple
					// make sure it is a var assignment?
					par.setRight(ARGUMENTS);
					self.func().body().unshift(par);
				};
			} else {
				// regular setters
				par.setRight(self.func().params().at(0,true));
				self.func().body().unshift(par);
			};
		};
		
		
		
		// If it is an advance tuple or something, it should be possible to
		// feed in the paramlist, and let the tuple handle it as if it was any
		// other value
		
		// CASE If this is a tuple / multiset with more than one async value
		// we need to think differently.
		
		// now we need to visit the function as well
		self.func().traverse();
		// pull the outer in
		return self;
	};
	
	
	function AsyncFunc(params,body,name,target,options){
		AsyncFunc.__super__.constructor.call(this,params,body,name,target,options);
	};
	
	subclass$(AsyncFunc,Func);
	exports.AsyncFunc = AsyncFunc; // export class 
	AsyncFunc.prototype.scopetype = function (){
		return LambdaScope;
	};
	
	// need to override, since we wont do implicit returns
	// def js
	// 	var code = scope.c
	// 	return "function ({params.c})" + code.wrap
	;
	
	
	
	// IMPORTS
	
	function ImportStatement(imports,source,ns){
		this._traversed = false;
		this._imports = imports;
		this._source = source;
		this._ns = ns;
		this;
	};
	
	subclass$(ImportStatement,Statement);
	exports.ImportStatement = ImportStatement; // export class 
	
	ImportStatement.prototype.__ns = {name: 'ns'};
	ImportStatement.prototype.ns = function(v){ return this._ns; }
	ImportStatement.prototype.setNs = function(v){ this._ns = v; return this; };
	
	ImportStatement.prototype.__imports = {name: 'imports'};
	ImportStatement.prototype.imports = function(v){ return this._imports; }
	ImportStatement.prototype.setImports = function(v){ this._imports = v; return this; };
	
	ImportStatement.prototype.__source = {name: 'source'};
	ImportStatement.prototype.source = function(v){ return this._source; }
	ImportStatement.prototype.setSource = function(v){ this._source = v; return this; };
	
	
	ImportStatement.prototype.visit = function (){
		if (this._ns) {
			this._nsvar || (this._nsvar = this.scope__().register(this._ns,this));
		} else {
			var src = this.source().c();
			var m = src.match(/(\w+)(\.js|imba)?[\"\']$/);
			this._alias = m ? (m[1] + '$') : ('mod$');
		};
		
		// should also register the imported items, no?
		if (this._imports) {
			var dec = this._declarations = new VariableDeclaration([]);
			
			if (this._imports.length == 1) {
				this._alias = this._imports[0];
				dec.add(this._alias,OP('.',CALL(new Identifier("require"),[this.source()]),this._alias));
				dec.traverse();
				return this;
				
				// dec.add(@alias,CALL(Identifier.new("require"),[source]))
			};
			
			// p "ImportStatement has imports {@imports:length}"
			// @declarations = VariableDeclaration.new([])
			this._moduledecl = dec.add(this._alias,CALL(new Identifier("require"),[this.source()]));
			this._moduledecl.traverse();
			
			
			if (this._imports.length > 1) {
				for (var i=0, ary=iter$(this._imports), len=ary.length, imp; i < len; i++) {
					imp = ary[i];this._declarations.add(imp,OP('.',this._moduledecl.variable(),imp));
				};
			};
			
			dec.traverse();
		};
		return this;
	};
	
	
	ImportStatement.prototype.js = function (o){
		
		var fname;
		if (this._declarations) {
			return this._declarations.c();
		};
		
		var req = CALL(new Identifier("require"),[this.source()]);
		
		if (this._ns) {
			// must register ns as a real variable
			return ("var " + (this._nsvar.c()) + " = " + (req.c()));
		};
		
		if (this._imports) {
			
			var src = this.source().c();
			var alias = [];
			var vars = new VarBlock([]);
			
			if (fname = src.match(/(\w+)(\.js|imba)?[\"\']$/)) {
				alias.push(fname[1]);
			};
			
			// var alias = src.match(/(\w+)(\.js|imba)?[\"\']$/)
			// p "source type {source}"
			// create a require for the source, with a temporary name?
			var out = [req.cache({names: alias}).c()];
			
			for (var i=0, ary=iter$(this._imports), len=ary.length, imp; i < len; i++) {
				// we also need to register these imports as variables, no?
				imp = ary[i];var o = OP('=',imp,OP('.',req,imp));
				out.push(("var " + (o.c())));
			};
			
			return out;
		} else {
			return req.c();
		};
	};
	
	ImportStatement.prototype.consume = function (node){
		return this;
	};
	
	
	
	// EXPORT 
	
	function ExportStatement(){ ValueNode.apply(this,arguments) };
	
	subclass$(ExportStatement,ValueNode);
	exports.ExportStatement = ExportStatement; // export class 
	ExportStatement.prototype.js = function (o){
		true;
		var nodes = this._value.map(function(arg) {
			return "module.exports." + (arg.c()) + " = " + (arg.c()) + ";\n";
		});
		return nodes.join("");
	};
	
	
	
	// UTILS
	
	function Util(args){
		this._args = args;
	};
	
	// this is how we deal with it now
	subclass$(Util,Node);
	exports.Util = Util; // export class 
	
	Util.prototype.__args = {name: 'args'};
	Util.prototype.args = function(v){ return this._args; }
	Util.prototype.setArgs = function(v){ this._args = v; return this; };
	
	Util.extend = function (a,b){
		return new Util.Extend([a,b]);
	};
	
	Util.repeat = function (str,times){
		var res = '';
		while (times > 0){
			if (times % 2 == 1) {
				res += str;
			};
			str += str;
			times >>= 1;
		};
		return res;
	};
	
	
	
	Util.keys = function (obj){
		var l = new Const("Object");
		var r = new Identifier("keys");
		return CALL(OP('.',l,r),[obj]);
	};
	
	Util.len = function (obj,cache){
		// p "LEN HELPER".green
		var r = new Identifier("length");
		var node = OP('.',obj,r);
		if (cache) { node.cache({force: true,pool: 'len'}) };
		return node;
	};
	
	Util.indexOf = function (lft,rgt){
		var node = new Util.IndexOf([lft,rgt]);
		// node.cache(force: yes, type: 'iter') if cache
		return node;
	};
	
	Util.slice = function (obj,a,b){
		var slice = new Identifier("slice");
		console.log(("slice " + a + " " + b));
		return CALL(OP('.',obj,slice),compact__([a,b]));
	};
	
	Util.iterable = function (obj,cache){
		var node = new Util.Iterable([obj]);
		if (cache) { node.cache({force: true,pool: 'iter'}) };
		return node;
	};
	
	
	
	Util.union = function (a,b){
		return new Util.Union([a,b]);
		// CALL(UNION,[a,b])
	};
	
	Util.intersect = function (a,b){
		return new Util.Intersect([a,b]);
		// CALL(INTERSECT,[a,b])
	};
	
	Util.counter = function (start,cache){
		// should it not rather be a variable?!?
		var node = new Num(start); // make sure it really is a number
		if (cache) { node.cache({force: true,pool: 'counter'}) };
		return node;
	};
	
	Util.array = function (size,cache){
		var node = new Util.Array([size]);
		if (cache) { node.cache({force: true,pool: 'list'}) };
		return node;
	};
	
	Util.defineTag = function (type,ctor,supr){
		return CALL(TAGDEF,[type,ctor,supr]);
	};
	
	
	Util.defineClass = function (name,supr,initor){
		return CALL(CLASSDEF,[name || initor,this.sup()]);
	};
	
	Util.prototype.js = function (o){
		return "helper";
	};
	
	
	Util.Union = function Union(){ Util.apply(this,arguments) };
	
	subclass$(Util.Union,Util);
	Util.Union.prototype.helper = function (){
		return 'function union$(a,b){\n	if(a && a.__union) return a.__union(b);\n\n	var u = a.slice(0);\n	for(var i=0,l=b.length;i<l;i++) if(u.indexOf(b[i]) == -1) u.push(b[i]);\n	return u;\n};\n';
	};
	
	
	Util.Union.prototype.js = function (o){
		this.scope__().root().helper(this,this.helper());
		// When this is triggered, we need to add it to the top of file?
		return "union$(" + (this.args().map(function(v) {
			return v.c();
		}).join(',')) + ")";
	};
	
	
	Util.Intersect = function Intersect(){ Util.apply(this,arguments) };
	
	subclass$(Util.Intersect,Util);
	Util.Intersect.prototype.helper = function (){
		return 'function intersect$(a,b){\n	if(a && a.__intersect) return a.__intersect(b);\n	var res = [];\n	for(var i=0, l=a.length; i<l; i++) {\n		var v = a[i];\n		if(b.indexOf(v) != -1) res.push(v);\n	}\n	return res;\n};\n';
	};
	
	Util.Intersect.prototype.js = function (o){
		// When this is triggered, we need to add it to the top of file?
		this.scope__().root().helper(this,this.helper());
		return "intersect$(" + (this.args().map(function(v) {
			return v.c();
		}).join(',')) + ")";
	};
	
	
	Util.Extend = function Extend(){ Util.apply(this,arguments) };
	
	subclass$(Util.Extend,Util);
	Util.Extend.prototype.js = function (o){
		// When this is triggered, we need to add it to the top of file?
		return "extend$(" + (compact__(cary__(this.args())).join(',')) + ")";
	};
	
	
	Util.IndexOf = function IndexOf(){ Util.apply(this,arguments) };
	
	subclass$(Util.IndexOf,Util);
	Util.IndexOf.prototype.helper = function (){
		return 'function idx$(a,b){\n	return (b && b.indexOf) ? b.indexOf(a) : [].indexOf.call(a,b);\n};\n';
	};
	
	
	Util.IndexOf.prototype.js = function (o){
		this.scope__().root().helper(this,this.helper());
		// When this is triggered, we need to add it to the top of file?
		return "idx$(" + (this.args().map(function(v) {
			return v.c();
		}).join(',')) + ")";
	};
	
	
	Util.Subclass = function Subclass(){ Util.apply(this,arguments) };
	
	subclass$(Util.Subclass,Util);
	Util.Subclass.prototype.helper = function (){
		// should also check if it is a real promise
		return '// helper for subclassing\nfunction subclass$(obj,sup) {\n	for (var k in sup) {\n		if (sup.hasOwnProperty(k)) obj[k] = sup[k];\n	};\n	// obj.__super__ = sup;\n	obj.prototype = Object.create(sup.prototype);\n	obj.__super__ = obj.prototype.__super__ = sup.prototype;\n	obj.prototype.initialize = obj.prototype.constructor = obj;\n};\n';
	};
	
	Util.Subclass.prototype.js = function (o){
		// When this is triggered, we need to add it to the top of file?
		this.scope__().root().helper(this,this.helper());
		return "subclass$(" + (this.args().map(function(v) {
			return v.c();
		}).join(',')) + ");\n";
	};
	
	
	Util.Promisify = function Promisify(){ Util.apply(this,arguments) };
	
	subclass$(Util.Promisify,Util);
	Util.Promisify.prototype.helper = function (){
		// should also check if it is a real promise
		return "function promise$(a)\{ return a instanceof Array ? Promise.all(a) : (a && a.then ? a : Promise.resolve(a)); \}";
	};
	
	Util.Promisify.prototype.js = function (o){
		// When this is triggered, we need to add it to the top of file?
		this.scope__().root().helper(this,this.helper());
		return "promise$(" + (this.args().map(function(v) {
			return v.c();
		}).join(',')) + ")";
	};
	
	
	Util.Class = function Class(){ Util.apply(this,arguments) };
	
	subclass$(Util.Class,Util);
	Util.Class.prototype.js = function (o){
		// When this is triggered, we need to add it to the top of file?
		return "class$(" + (this.args().map(function(v) {
			return v.c();
		}).join(',')) + ")";
	};
	
	
	Util.Iterable = function Iterable(){ Util.apply(this,arguments) };
	
	subclass$(Util.Iterable,Util);
	Util.Iterable.prototype.helper = function (){
		// now we want to allow null values as well - just return as empty collection
		// should be the same for for own of I guess
		return "function iter$(a)\{ return a ? (a.toArray ? a.toArray() : a) : []; \};";
	};
	
	Util.Iterable.prototype.js = function (o){
		if (this.args()[0] instanceof Arr) { return this.args()[0].c() }; // or if we know for sure that it is an array
		// only wrap if it is not clear that this is an array?
		this.scope__().root().helper(this,this.helper());
		return ("iter$(" + (this.args()[0].c()) + ")");
	};
	
	
	Util.IsFunction = function IsFunction(){ Util.apply(this,arguments) };
	
	subclass$(Util.IsFunction,Util);
	Util.IsFunction.prototype.js = function (o){
		// p "IS FUNCTION {args[0]}"
		// just plain check for now
		return "" + (this.args()[0].c());
		// "isfn$({args[0].c})"
		// "typeof {args[0].c} == 'function'"
	};
	
	
	
	Util.Array = function Array(){ Util.apply(this,arguments) };
	
	subclass$(Util.Array,Util);
	Util.Array.prototype.js = function (o){
		// When this is triggered, we need to add it to the top of file?
		return "new Array(" + (this.args().map(function(v) {
			return v.c();
		})) + ")";
	};
	
	
	
	
	
	
	
	
	// SCOPES
	
	// handles local variables, self etc. Should create references to outer scopes
	// when needed etc.
	
	// should move the whole context-thingie right into scope
	function Scope(node,parent){
		this._head = [];
		this._node = node;
		this._parent = parent;
		this._vars = new VariableDeclaration([]);
		this._closure = this;
		this._virtual = false;
		this._counter = 0;
		this._varmap = {};
		this._varpool = [];
	};
	
	exports.Scope = Scope; // export class 
	
	Scope.prototype.__level = {name: 'level'};
	Scope.prototype.level = function(v){ return this._level; }
	Scope.prototype.setLevel = function(v){ this._level = v; return this; };
	
	Scope.prototype.__context = {name: 'context'};
	Scope.prototype.context = function(v){ return this._context; }
	Scope.prototype.setContext = function(v){ this._context = v; return this; };
	
	Scope.prototype.__node = {name: 'node'};
	Scope.prototype.node = function(v){ return this._node; }
	Scope.prototype.setNode = function(v){ this._node = v; return this; };
	
	Scope.prototype.__parent = {name: 'parent'};
	Scope.prototype.parent = function(v){ return this._parent; }
	Scope.prototype.setParent = function(v){ this._parent = v; return this; };
	
	Scope.prototype.__varmap = {name: 'varmap'};
	Scope.prototype.varmap = function(v){ return this._varmap; }
	Scope.prototype.setVarmap = function(v){ this._varmap = v; return this; };
	
	Scope.prototype.__varpool = {name: 'varpool'};
	Scope.prototype.varpool = function(v){ return this._varpool; }
	Scope.prototype.setVarpool = function(v){ this._varpool = v; return this; };
	
	Scope.prototype.__params = {name: 'params'};
	Scope.prototype.params = function(v){ return this._params; }
	Scope.prototype.setParams = function(v){ this._params = v; return this; };
	
	Scope.prototype.__head = {name: 'head'};
	Scope.prototype.head = function(v){ return this._head; }
	Scope.prototype.setHead = function(v){ this._head = v; return this; };
	
	Scope.prototype.__vars = {name: 'vars'};
	Scope.prototype.vars = function(v){ return this._vars; }
	Scope.prototype.setVars = function(v){ this._vars = v; return this; };
	
	Scope.prototype.__counter = {name: 'counter'};
	Scope.prototype.counter = function(v){ return this._counter; }
	Scope.prototype.setCounter = function(v){ this._counter = v; return this; };
	
	Scope.prototype.p = function (){
		if (STACK.loglevel() > 0) {
			console.log.apply(console,arguments);
		};
		return this;
	};
	
	Scope.prototype.context = function (){
		return this._context || (this._context = new ScopeContext(this));
	};
	
	Scope.prototype.traverse = function (){
		return this;
	};
	
	Scope.prototype.visit = function (){
		if (this._parent) { return this };
		// p "visited scope!"
		this._parent = STACK.scope(1); // the parent scope
		this._level = STACK.scopes().length - 1;
		
		// p "parent is",@parent
		
		STACK.addScope(this);
		this.root().scopes().push(this);
		return this;
	};
	
	// called for scopes that are not real scopes in js
	// must ensure that the local variables inside of the scopes do not
	// collide with variables in outer scopes -- rename if needed
	Scope.prototype.virtualize = function (){
		return this;
	};
	
	Scope.prototype.root = function (){
		var scope = this;
		while (scope){
			if (scope instanceof FileScope) { return scope };
			scope = scope.parent();
		};
		return null;
	};
	
	Scope.prototype.register = function (name,decl,o){
		
		// FIXME re-registering a variable should really return the existing one
		// Again, here we should not really have to deal with system-generated vars
		// But again, it is important
		
		// p "registering {name}"
		if(decl === undefined) decl = null;
		if(o === undefined) o = {};
		name = helpers.symbolize(name);
		
		// also look at outer scopes if this is not closed?
		var existing = this._varmap.hasOwnProperty(name) && this._varmap[name];
		if (existing) { return existing };
		
		var item = new Variable(this,name,decl,o);
		// need to check for duplicates, and handle this gracefully -
		// going to refactor later
		if (!(o.system)) { this._varmap[name] = item }; // dont even add to the varmap if it is a sysvar
		return item;
	};
	
	// just like register, but we automatically 
	Scope.prototype.declare = function (name,init,o){
		
		var declarator_;
		if(init === undefined) init = null;
		if(o === undefined) o = {};
		var variable = this.register(name,null,o);
		// TODO create the variabledeclaration here instead?
		// if this is a sysvar we need it to be renameable
		var dec = this._vars.add(variable,init);
		(declarator_=variable.declarator()) || ((variable.setDeclarator(dec),dec));
		return variable;
		
		// p "declare variable {name} {o}"
		// if name isa Variable
		// p "SCOPE declare var".green
		name = helpers.symbolize(name);
		// we will see here
		this._vars.add(name,init); // .last -- 
		var decl = this._vars.last(); // bug(!)
		var item;
		// item = Variable.new(self,name,decl)
		
		// if o:system
		// 	item = SystemVariable.new(self,name,decl,o)
		// 	decl.variable = item
		// else
		item = new Variable(this,name,decl,o);
		decl.setVariable(item);
		item.resolve(); // why on earth should it resolve immediately?
		
		// decl.variable = item
		// item.resolve # why on earth should it resolve immediately?
		return item;
		
		// should be possible to force-declare for this scope, no?
		// if this is a system-variable 
	};
	
	// declares a variable (has no real declaration beforehand)
	
	
	// what are the differences here? omj
	// we only need a temporary thing with defaults -- that is all
	// change these values, no?
	Scope.prototype.temporary = function (refnode,o,name){
		
		// p "registering temporary {refnode} {name}"
		// reuse variables -- hmm
		if(o === undefined) o = {};
		if(name === undefined) name = null;
		if (o.pool) {
			for (var i=0, ary=iter$(this._varpool), len=ary.length, v; i < len; i++) {
				v = ary[i];if (v.pool() == o.pool && v.declarator() == null) {
					return v.reuse(refnode);
				};
			};
		};
		
		// should only 'register' as ahidden variable, no?
		// if there are real nodes inside that tries to refer to vars
		// defined in outer scopes, we need to make sure they are not named after this
		var item = new SystemVariable(this,name,refnode,o);
		this._varpool.push(item); // WHAT? It should not be in the pool unless explicitly put there?
		this._vars.push(item); // WARN variables should not go directly into a declaration-list
		return item;
		// return register(name || "__",null,system: yes, temporary: yes)
	};
	
	
	
	Scope.prototype.lookup = function (name){
		var ret = null;
		name = helpers.symbolize(name);
		if (this._varmap.hasOwnProperty(name)) {
			ret = this._varmap[name];
		} else {
			// look up any parent scope ?? seems okay
			// !isClosed && 
			ret = this.parent() && this.parent().lookup(name);
			// or -- not all scopes have a parent?
		};
		
		// should this not happen by itself?
		// if !ret and 
		//	ret = 
		// ret ||= (g.lookup(name) if var g = root)
		// g = root
		return ret;
	};
	
	Scope.prototype.autodeclare = function (variable){
		return this.vars().push(variable); // only if it does not exist here!!!
	};
	
	Scope.prototype.free = function (variable){
		// p "free variable"
		variable.free(); // :owner = null
		// @varpool.push(variable)
		return this;
	};
	
	Scope.prototype.isClosed = function (){
		return false;
	};
	
	Scope.prototype.closure = function (){
		return this._closure;
	};
	
	Scope.prototype.finalize = function (){
		return this;
	};
	
	Scope.prototype.klass = function (){
		var scope = this;
		while (scope){
			scope = scope.parent();
			if (scope instanceof ClassScope) { return scope };
		};
		return null;
	};
	
	Scope.prototype.head = function (){
		return [this._vars,this._params];
	};
	
	Scope.prototype.c = function (o){
		var body;
		if(o === undefined) o = {};
		o.expression = false;
		// need to fix this
		this.node().body().setHead(this.head());
		return body = this.node().body().c(o);
		
		// var head = [@vars,@params].block.c(expression: no)
		// p "head from scope is ({head})"
		// var out = [head or null,body].flatten__.compact.join("\n")
		// out
		// out = '{' + out + 
	};
	
	Scope.prototype.region = function (){
		return this.node().body().region();
	};
	
	Scope.prototype.dump = function (){
		var self=this;
		var vars = Object.keys(this._varmap).map(function(k) {
			var v = self._varmap[k];
			return v.references().length ? (dump__(v)) : (null);
		});
		
		return {type: self.constructor.name,
		level: (self.level() || 0),
		vars: compact__(vars),
		loc: self.region()};
	};
	
	Scope.prototype.toString = function (){
		return "" + (this.constructor.name);
	};
	
	
	
	// FileScope is wrong? Rather TopScope or ProgramScope
	function FileScope(){
		FileScope.__super__.constructor.apply(this,arguments);
		// really? makes little sense
		this.register('global',this,{type: 'global'});
		this.register('exports',this,{type: 'global'});
		this.register('console',this,{type: 'global'});
		this.register('process',this,{type: 'global'});
		this.register('setTimeout',this,{type: 'global'});
		this.register('setInterval',this,{type: 'global'});
		this.register('clearTimeout',this,{type: 'global'});
		this.register('clearInterval',this,{type: 'global'});
		this.register('__dirname',this,{type: 'global'});
		// preregister global special variables here
		this._warnings = [];
		this._scopes = [];
		this._helpers = [];
		this._head = [this._vars];
	};
	
	subclass$(FileScope,Scope);
	exports.FileScope = FileScope; // export class 
	
	FileScope.prototype.__warnings = {name: 'warnings'};
	FileScope.prototype.warnings = function(v){ return this._warnings; }
	FileScope.prototype.setWarnings = function(v){ this._warnings = v; return this; };
	
	FileScope.prototype.__scopes = {name: 'scopes'};
	FileScope.prototype.scopes = function(v){ return this._scopes; }
	FileScope.prototype.setScopes = function(v){ this._scopes = v; return this; };
	
	FileScope.prototype.context = function (){
		return this._context || (this._context = new RootScopeContext(this));
	};
	
	FileScope.prototype.lookup = function (name){
		// p "lookup filescope"
		name = helpers.symbolize(name);
		if (this._varmap.hasOwnProperty(name)) { return this._varmap[name] };
	};
	
	FileScope.prototype.visit = function (){
		STACK.addScope(this);
		return this;
	};
	
	FileScope.prototype.helper = function (typ,value){
		// log "add helper",typ,value
		if (this._helpers.indexOf(value) == -1) {
			this._helpers.push(value);
			this._head.unshift(value);
		};
		
		return this;
	};
	
	FileScope.prototype.head = function (){
		return this._head;
	};
	
	FileScope.prototype.warn = function (data){
		// hacky
		data.node = null;
		// p "warning",JSON.stringify(data)
		this._warnings.push(data);
		return this;
	};
	
	FileScope.prototype.dump = function (){
		var scopes = this._scopes.map(function(s) {
			return s.dump();
		});
		scopes.unshift(FileScope.__super__.dump.call(this));
		
		var obj = {
			warnings: dump__(this._warnings),
			scopes: scopes
		};
		
		return obj;
	};
	
	
	
	function ClassScope(){ Scope.apply(this,arguments) };
	
	subclass$(ClassScope,Scope);
	exports.ClassScope = ClassScope; // export class 
	ClassScope.prototype.virtualize = function (){
		// console.log "virtualizing ClassScope"
		var up = this.parent();
		for (var o=this._varmap, i=0, keys=Object.keys(o), l=keys.length; i < l; i++){
			true;
			o[keys[i]].resolve(up,true); // force new resolve
		};
		return this;
	};
	
	ClassScope.prototype.isClosed = function (){
		return true;
	};
	
	
	function TagScope(){ ClassScope.apply(this,arguments) };
	
	subclass$(TagScope,ClassScope);
	exports.TagScope = TagScope; // export class 
	
	
	function ClosureScope(){ Scope.apply(this,arguments) };
	
	subclass$(ClosureScope,Scope);
	exports.ClosureScope = ClosureScope; // export class 
	
	
	function FunctionScope(){ Scope.apply(this,arguments) };
	
	subclass$(FunctionScope,Scope);
	exports.FunctionScope = FunctionScope; // export class 
	
	
	function MethodScope(){ Scope.apply(this,arguments) };
	
	subclass$(MethodScope,Scope);
	exports.MethodScope = MethodScope; // export class 
	MethodScope.prototype.isClosed = function (){
		return true;
	};
	
	
	function LambdaScope(){ Scope.apply(this,arguments) };
	
	subclass$(LambdaScope,Scope);
	exports.LambdaScope = LambdaScope; // export class 
	LambdaScope.prototype.context = function (){
		
		// when accessing the outer context we need to make sure that it is cached
		// so this is wrong - but temp okay
		return this._context || (this._context = this.parent().context().reference(this));
	};
	
	
	function FlowScope(){ Scope.apply(this,arguments) };
	
	subclass$(FlowScope,Scope);
	exports.FlowScope = FlowScope; // export class 
	FlowScope.prototype.params = function (){
		if (this._parent) { return this._parent.params() };
	};
	
	FlowScope.prototype.register = function (name,decl,o){
		var found;
		if(decl === undefined) decl = null;
		if(o === undefined) o = {};
		if (o.type != 'let' && (this.closure() != this)) {
			if (found = this.lookup(name)) {
				// p "already found variable {found.type}"
				if (found.type() == 'let') {
					this.p(("" + name + " already exists as a block-variable " + decl));
					// TODO should throw error instead
					if (decl) { decl.warn("Variable already exists in block") };
					// root.warn message: "Holy shit"
				};
				// if found.
			};
			// p "FlowScope register var -- do it right in the outer scope"
			return this.closure().register(name,decl,o);
		} else {
			// p "Register local variable for FlowScope {name}"
			// o:closure = parent
			// p "FlowScope register", arguments
			return FlowScope.__super__.register.call(this,name,decl,o);
		};
	};
	
	FlowScope.prototype.autodeclare = function (variable){
		return this.parent().autodeclare(variable);
	};
	
	FlowScope.prototype.closure = function (){
		// rather all the way?
		return this._parent.closure(); // this is important?
	};
	
	FlowScope.prototype.context = function (){
		// if we are wrapping in an expression - we do need to add a reference
		// @referenced = yes
		return this.parent().context();
		// usually - if the parent scope is a closed scope we dont really need
		// to force a reference
		// @context ||= parent.context.reference(self)
	};
	
	
	function CatchScope(){ FlowScope.apply(this,arguments) };
	
	subclass$(CatchScope,FlowScope);
	exports.CatchScope = CatchScope; // export class 
	
	
	function WhileScope(){ FlowScope.apply(this,arguments) };
	
	subclass$(WhileScope,FlowScope);
	exports.WhileScope = WhileScope; // export class 
	WhileScope.prototype.autodeclare = function (variable){
		return this.vars().push(variable);
	};
	
	
	function ForScope(){ FlowScope.apply(this,arguments) };
	
	subclass$(ForScope,FlowScope);
	exports.ForScope = ForScope; // export class 
	ForScope.prototype.autodeclare = function (variable){
		return this.vars().push(variable);
		// parent.autodeclare(variable)
	};
	
	// def closure
	// 	self
	;
	
	function IfScope(){ FlowScope.apply(this,arguments) };
	
	subclass$(IfScope,FlowScope);
	exports.IfScope = IfScope; // export class 
	IfScope.prototype.temporary = function (refnode,o,name){
		if(o === undefined) o = {};
		if(name === undefined) name = null;
		return this.parent().temporary(refnode,o,name);
	};
	
	
	function BlockScope(){ FlowScope.apply(this,arguments) };
	
	subclass$(BlockScope,FlowScope);
	exports.BlockScope = BlockScope; // export class 
	BlockScope.prototype.temporary = function (refnode,o,name){
		if(o === undefined) o = {};
		if(name === undefined) name = null;
		return this.parent().temporary(refnode,o,name);
	};
	
	BlockScope.prototype.region = function (){
		return this.node().region();
	};
	
	
	// lives in scope -- really a node???
	function Variable(scope,name,decl,o){
		this._ref = STACK._counter++;
		this._c = null;
		this._scope = scope;
		this._name = name;
		this._alias = null;
		this._initialized = true;
		this._declarator = decl;
		this._autodeclare = false;
		this._declared = o && o.declared || false;
		this._resolved = false;
		this._options = o || {};
		this._type = o && o.type || 'var'; // what about let here=
		this._export = false;
		this._references = []; // only needed when profiling
		this._assignments = [];
		this;
	};
	
	subclass$(Variable,Node);
	exports.Variable = Variable; // export class 
	
	Variable.prototype.__scope = {name: 'scope'};
	Variable.prototype.scope = function(v){ return this._scope; }
	Variable.prototype.setScope = function(v){ this._scope = v; return this; };
	
	Variable.prototype.__name = {name: 'name'};
	Variable.prototype.name = function(v){ return this._name; }
	Variable.prototype.setName = function(v){ this._name = v; return this; };
	
	Variable.prototype.__alias = {name: 'alias'};
	Variable.prototype.alias = function(v){ return this._alias; }
	Variable.prototype.setAlias = function(v){ this._alias = v; return this; };
	
	Variable.prototype.__type = {name: 'type'};
	Variable.prototype.type = function(v){ return this._type; }
	Variable.prototype.setType = function(v){ this._type = v; return this; };
	
	Variable.prototype.__options = {name: 'options'};
	Variable.prototype.options = function(v){ return this._options; }
	Variable.prototype.setOptions = function(v){ this._options = v; return this; };
	
	Variable.prototype.__initialized = {name: 'initialized'};
	Variable.prototype.initialized = function(v){ return this._initialized; }
	Variable.prototype.setInitialized = function(v){ this._initialized = v; return this; };
	
	Variable.prototype.__declared = {name: 'declared'};
	Variable.prototype.declared = function(v){ return this._declared; }
	Variable.prototype.setDeclared = function(v){ this._declared = v; return this; };
	
	Variable.prototype.__declarator = {name: 'declarator'};
	Variable.prototype.declarator = function(v){ return this._declarator; }
	Variable.prototype.setDeclarator = function(v){ this._declarator = v; return this; };
	
	Variable.prototype.__autodeclare = {name: 'autodeclare'};
	Variable.prototype.autodeclare = function(v){ return this._autodeclare; }
	Variable.prototype.setAutodeclare = function(v){ this._autodeclare = v; return this; };
	
	Variable.prototype.__references = {name: 'references'};
	Variable.prototype.references = function(v){ return this._references; }
	Variable.prototype.setReferences = function(v){ this._references = v; return this; };
	
	Variable.prototype.__export = {name: 'export'};
	Variable.prototype.export = function(v){ return this._export; }
	Variable.prototype.setExport = function(v){ this._export = v; return this; };
	
	Variable.prototype.pool = function (){
		return null;
	};
	
	Variable.prototype.closure = function (){
		return this._scope.closure();
	};
	
	Variable.prototype.assignments = function (){
		return this._assignments;
	};
	
	// Here we can collect lots of type-info about variables
	// and show warnings / give advice if variables are ambiguous etc
	Variable.prototype.assigned = function (val,source){
		this._assignments.push(val);
		// p "Variable was assigned {val}"
		if (val instanceof Arr) {
			// just for testing really
			this._isArray = true;
		} else {
			this._isArray = false;
		};
		return this;
	};
	
	Variable.prototype.resolve = function (scope,force){
		if(scope === undefined) scope = this.scope();
		if(force === undefined) force = false;
		if (this._resolved && !force) { return this };
		
		this._resolved = true;
		var closure = this._scope.closure();
		var item = scope.lookup(this._name);
		
		// if this is a let-definition inside a virtual scope we do need
		// 
		if (this._scope != closure && this._type == 'let') { // or if it is a system-variable
			// p "scope is not the closure -- need to resolve {@name}"
			item = closure.lookup(this._name);
			
			// we now need to ensure that this variable is unique inside
			// the whole closure.
			scope = closure;
		};
		
		// p "scope is not the closure -- need to resolve {@name} {@type}"
		
		if (item == this) {
			scope.varmap()[this._name] = this;
			return this;
		} else if (item) {
			// p "variable already exists {@name}"
			
			// possibly redefine this inside, use it only in this scope
			// if the item is defined in an outer scope - we reserve the
			if (item.scope() != scope && (this.options().let || this._type == 'let')) {
				// p "override variable inside this scope {@name}"
				scope.varmap()[this._name] = this;
			};
			
			// different rules for different variables?
			if (this._options.proxy) {
				// p "is proxy -- no need to change name!!! {name}".cyan
				true;
			} else {
				var i = 0;
				var orig = this._name;
				// it is the closure that we should use
				while (scope.lookup(this._name)){
					this._name = ("" + orig + (i += 1));
				};
			};
		};
		
		// inefficient double setting
		scope.varmap()[this._name] = this;
		closure.varmap()[this._name] = this;
		return this;
		// p "resolve variable".cyan
	};
	
	Variable.prototype.reference = function (){
		return this;
	};
	
	Variable.prototype.node = function (){
		return this;
	};
	
	Variable.prototype.traverse = function (){
		// NODES.push(self)
		return this;
	};
	
	Variable.prototype.free = function (ref){
		// p "free variable!"
		this._declarator = null;
		return this;
	};
	
	Variable.prototype.reuse = function (ref){
		this._declarator = ref;
		return this;
	};
	
	Variable.prototype.proxy = function (par,index){
		this._proxy = [par,index];
		return this;
	};
	
	Variable.prototype.refcount = function (){
		return this._references.length;
	};
	
	Variable.prototype.c = function (){
		if (this._c) { return this._c };
		// options - proxy??
		if (this._proxy) {
			// p "var is proxied!",@proxy
			this._c = this._proxy[0].c() + '[' + this._proxy[1].c() + ']';
		} else {
			if (!(this._resolved)) this.resolve();
			var v = (this.alias() || this.name());
			this._c = typeof v == 'string' ? (v) : (v.c());
			// allow certain reserved words
			// should warn on others though (!!!)
			if (RESERVED_REGEX.test(this._c)) { this._c = ("" + this.c() + "$") }; // @c.match(/^(default)$/)
		};
		return this._c;
	};
	
	// variables should probably inherit from node(!)
	Variable.prototype.consume = function (node){
		// p "variable assignify!!!"
		return this;
	};
	
	// this should only generate the accessors - not dael with references
	Variable.prototype.accessor = function (ref){
		var node = new LocalVarAccess(".",null,this); // this is just wrong .. should not be a regular accessor
		// @references.push([ref,el]) if ref # weird temp format
		return node;
	};
	
	Variable.prototype.assignment = function (val){
		return new Assign('=',this,val);
	};
	
	Variable.prototype.addReference = function (ref){
		if (ref.region && ref.region()) { this._references.push(ref) };
		// p "reference is {ref:region and ref.region}"
		return this;
	};
	
	Variable.prototype.autodeclare = function (){
		if (this._declared) { return this };
		// p "variable should autodeclare(!) {name}"
		this._autodeclare = true;
		this.scope().autodeclare(this);
		this._declared = true;
		return this;
	};
	
	Variable.prototype.predeclared = function (){
		this._declared = true;
		return this;
	};
	
	
	Variable.prototype.toString = function (){
		return String(this.name());
	};
	
	Variable.prototype.dump = function (typ){
		var name = this.name();
		if (name[0].match(/[A-Z]/)) { return null };
		// console.log "dump variable of type {type} - {name}"
		return {
			type: this.type(),
			name: name,
			refs: dump__(this._references,typ)
		};
	};
	
	
	
	function SystemVariable(){ Variable.apply(this,arguments) };
	
	subclass$(SystemVariable,Variable);
	exports.SystemVariable = SystemVariable; // export class 
	SystemVariable.prototype.pool = function (){
		return this._options.pool;
	};
	
	// weird name for this
	SystemVariable.prototype.predeclared = function (){
		// p "remove var from scope(!)"
		this.scope().vars().remove(this);
		return this;
	};
	
	SystemVariable.prototype.resolve = function (){
		var alias, v_;
		if (this._resolved || this._name) { return this };
		// p "RESOLVE SYSTEM VARIABLE".red
		this._resolved = true;
		// unless @name
		// adds a very random initial name
		// the auto-magical goes last, or at least, possibly reuse other names
		// "${Math.floor(Math.random * 1000)}"
		
		var typ = this._options.pool;
		var names = [].concat(this._options.names);
		var alt = null;
		var node = null;
		
		var scope = this.scope();
		
		if (typ == 'tag') {
			var i = 0;
			while (!(this._name)){
				alt = ("t" + (i++));
				if (!scope.lookup(alt)) { this._name = alt };
			};
		} else if (typ == 'iter') {
			names = ['ary__','ary_','coll','array','items','ary'];
		} else if (typ == 'val') {
			names = ['v_'];
		} else if (typ == 'arguments') {
			names = ['$_','$0'];
		} else if (typ == 'keypars') {
			names = ['opts','options','pars'];
		} else if (typ == 'counter') {
			names = ['i__','i_','k','j','i'];
		} else if (typ == 'len') {
			names = ['len__','len_','len'];
		} else if (typ == 'list') {
			names = ['tmplist_','tmplist','tmp'];
		};
		// or if type placeholder / cacher (add 0)
		
		while (!(this._name) && (alt = names.pop())){
			if (!scope.lookup(alt)) { this._name = alt };
		};
		
		if (!(this._name) && this._declarator) {
			if (node = this.declarator().node()) {
				if (alias = node.alias()) { names.push(alias + "_") };
			};
		};
		
		while (!(this._name) && (alt = names.pop())){
			if (!scope.lookup(alt)) { this._name = alt };
		};
		
		// p "suggested names {names.join(" , ")} {node}".cyan
		//  Math.floor(Math.random * 1000)
		this._name || (this._name = ("$" + ((scope.setCounter(v_=scope.counter() + 1),v_))));
		// p "name for variable is {@name}"
		scope.varmap()[this._name] = this;
		return this;
	};
	
	SystemVariable.prototype.name = function (){
		this.resolve();
		return this._name;
	};
	
	
	
	function ScopeContext(scope,value){
		this._scope = scope;
		this._value = value;
		this._reference = null;
		this;
	};
	
	// instead of all these references we should probably
	// just register when it is accessed / looked up from
	// a deeper function-scope, and when it is, we should
	// register the variable in scope, and then start to
	// use that for further references. Might clean things
	// up for the cases where we have yet to decide the
	// name of the variable etc?
	
	subclass$(ScopeContext,Node);
	exports.ScopeContext = ScopeContext; // export class 
	
	ScopeContext.prototype.__scope = {name: 'scope'};
	ScopeContext.prototype.scope = function(v){ return this._scope; }
	ScopeContext.prototype.setScope = function(v){ this._scope = v; return this; };
	
	ScopeContext.prototype.__value = {name: 'value'};
	ScopeContext.prototype.value = function(v){ return this._value; }
	ScopeContext.prototype.setValue = function(v){ this._value = v; return this; };
	
	ScopeContext.prototype.reference = function (){
		// p "p reference {STACK.scoping}"
		// should be a special context-variable!!!
		return this._reference || (this._reference = this.scope().declare("self",new This()));
	};
	
	ScopeContext.prototype.c = function (){
		var val = this._value || this._reference;
		return val ? (val.c()) : ("this");
	};
	
	
	function RootScopeContext(){ ScopeContext.apply(this,arguments) };
	
	subclass$(RootScopeContext,ScopeContext);
	exports.RootScopeContext = RootScopeContext; // export class 
	RootScopeContext.prototype.reference = function (scope){
		return this;
	};
	
	RootScopeContext.prototype.c = function (o){
		if (o && o.explicit) { return "" };
		var val = this._value || this._reference;
		return val ? (val.c()) : ("this");
		// should be the other way around, no?
		// o and o:explicit ? super : ""
	};
	
	
	function Super(){ Node.apply(this,arguments) };
	
	subclass$(Super,Node);
	exports.Super = Super; // export class 
	Super.prototype.c = function (){
		// need to find the stuff here
		// this is really not that good8
		var m = STACK.method();
		var out = null;
		var up = STACK.current();
		var deep = (up instanceof Access);
		
		// TODO optimization for later - problematic if there is a different reference in the end
		if (false && m && m.type() == 'constructor') {
			out = ("" + (m.target().c()) + ".superclass");
			if (!deep) { out += (".apply(" + (m.scope().context().c()) + ",arguments)") };
		} else {
			out = ("" + (m.target().c()) + ".__super__");
			if (!((up instanceof Access))) {
				out += ("." + (c__(m.supername())));
				if (!((up instanceof Call))) { // autocall?
					out += (".apply(" + (m.scope().context().c()) + ",arguments)");
				};
			};
		};
		return out;
	};
	
	
	// constants
	
	module.exports.BR = BR = new Newline('\n');
	module.exports.BR2 = BR2 = new Newline('\n\n');
	module.exports.SELF = SELF = new Self();
	module.exports.SUPER = SUPER = new Super();
	
	module.exports.TRUE = TRUE = new True('true');
	module.exports.FALSE = FALSE = new False('false');
	module.exports.UNDEFINED = UNDEFINED = new Undefined();
	module.exports.NIL = NIL = new Nil();
	
	module.exports.ARGUMENTS = ARGUMENTS = new ArgsReference('arguments');
	module.exports.EMPTY = EMPTY = '';
	module.exports.NULL = NULL = 'null';
	
	module.exports.RESERVED = RESERVED = ['default','native','enum','with'];
	module.exports.RESERVED_REGEX = RESERVED_REGEX = /^(default|native|enum|with)$/;
	
	module.exports.UNION = UNION = new Const('union$');
	module.exports.INTERSECT = INTERSECT = new Const('intersect$');
	module.exports.CLASSDEF = CLASSDEF = new Const('imba$class');
	module.exports.TAGDEF = TAGDEF = new Const('Imba.Tag.define');
	module.exports.NEWTAG = NEWTAG = new Identifier("tag$");


}())
},{"./helpers":4,"./token":10}],8:[function(require,module,exports){
(function (process){
/* parser generated by jison-fork */
var parser = (function(){
var o=function(k,v,o,l){for(o=o||{},l=k.length;l--;o[k[l]]=v);return o},$V0=[1,4],$V1=[1,6],$V2=[1,32],$V3=[1,33],$V4=[1,34],$V5=[1,35],$V6=[1,75],$V7=[1,115],$V8=[1,127],$V9=[1,120],$Va=[1,121],$Vb=[1,122],$Vc=[1,119],$Vd=[1,123],$Ve=[1,128],$Vf=[1,114],$Vg=[1,80],$Vh=[1,81],$Vi=[1,82],$Vj=[1,83],$Vk=[1,84],$Vl=[1,85],$Vm=[1,86],$Vn=[1,73],$Vo=[1,117],$Vp=[1,95],$Vq=[1,91],$Vr=[1,88],$Vs=[1,71],$Vt=[1,65],$Vu=[1,66],$Vv=[1,111],$Vw=[1,90],$Vx=[1,87],$Vy=[1,28],$Vz=[1,29],$VA=[1,96],$VB=[1,94],$VC=[1,112],$VD=[1,113],$VE=[1,125],$VF=[1,67],$VG=[1,68],$VH=[1,118],$VI=[1,11],$VJ=[1,126],$VK=[1,78],$VL=[1,37],$VM=[1,43],$VN=[1,110],$VO=[1,69],$VP=[1,89],$VQ=[1,124],$VR=[1,59],$VS=[1,74],$VT=[1,105],$VU=[1,106],$VV=[1,107],$VW=[1,108],$VX=[1,63],$VY=[1,104],$VZ=[1,51],$V_=[1,52],$V$=[1,53],$V01=[1,54],$V11=[1,55],$V21=[1,56],$V31=[1,130],$V41=[1,6,11,129],$V51=[1,132],$V61=[1,6,11,14,129],$V71=[1,141],$V81=[1,142],$V91=[1,144],$Va1=[1,136],$Vb1=[1,138],$Vc1=[1,137],$Vd1=[1,139],$Ve1=[1,140],$Vf1=[1,143],$Vg1=[1,147],$Vh1=[1,6,10,11,14,22,83,90,99,104,117,127,129,139,163,191,192,203,204,205,210,218,227,228,231,232,235,236,237],$Vi1=[2,256],$Vj1=[1,154],$Vk1=[1,159],$Vl1=[1,157],$Vm1=[1,156],$Vn1=[1,160],$Vo1=[1,158],$Vp1=[1,6,10,11,14,22,83,90,129],$Vq1=[1,6,11,14,129,203,205,210,227],$Vr1=[1,6,10,11,14,21,22,81,82,83,90,99,103,104,117,127,129,136,139,163,172,174,187,191,192,203,204,205,210,218,227,228,231,232,235,236,237],$Vs1=[2,224],$Vt1=[1,173],$Vu1=[1,171],$Vv1=[1,6,10,11,14,21,22,81,82,83,90,99,103,104,108,117,127,129,136,139,163,172,174,187,191,192,203,204,205,210,218,227,228,231,232,235,236,237],$Vw1=[2,220],$Vx1=[6,14,53,54,81,84,99,103,107],$Vy1=[1,206],$Vz1=[1,211],$VA1=[1,6,10,11,14,21,22,81,82,83,90,99,103,104,108,117,127,129,136,139,163,172,174,187,191,192,203,204,205,210,218,227,228,231,232,233,234,235,236,237,238],$VB1=[1,221],$VC1=[1,218],$VD1=[1,223],$VE1=[6,10,14,83],$VF1=[2,237],$VG1=[1,251],$VH1=[1,241],$VI1=[1,270],$VJ1=[1,271],$VK1=[51,82],$VL1=[78,79,80,81,84,85,86,87,88,89,93,95],$VM1=[1,279],$VN1=[1,6,10,11,14,21,22,53,54,81,82,83,84,90,99,103,104,107,108,117,127,129,136,139,163,172,174,187,191,192,203,204,205,210,218,227,228,231,232,233,234,235,236,237,238],$VO1=[1,285],$VP1=[1,6,10,11,14,21,22,81,82,83,90,99,103,104,117,127,129,136,139,163,172,174,187,191,192,198,199,203,204,205,210,218,221,223,226,227,228,231,232,235,236,237],$VQ1=[51,53,54,58],$VR1=[1,315],$VS1=[1,316],$VT1=[1,6,10,11,14,22,83,90,99,104,127,129,139,191,192,203,204,205,210,218,227],$VU1=[1,329],$VV1=[1,333],$VW1=[1,6,11,14,22,83,90,99,104,117,127,129,139,163,191,192,203,204,205,210,218,227,228,231,232,235,236,237],$VX1=[6,14,99],$VY1=[1,342],$VZ1=[1,6,10,11,14,21,22,82,83,90,99,104,117,127,129,139,163,191,192,203,204,205,210,218,227,228,231,232,235,236,237],$V_1=[14,28],$V$1=[1,6,11,14,28,129,203,205,210,227],$V02=[2,277],$V12=[1,6,10,11,14,21,22,81,82,83,90,99,103,104,108,117,127,129,136,139,163,172,174,187,191,192,203,204,205,210,216,217,218,227,228,231,232,233,234,235,236,237,238],$V22=[2,178],$V32=[1,357],$V42=[6,10,11,14,22,90],$V52=[14,139],$V62=[2,180],$V72=[1,367],$V82=[1,368],$V92=[1,369],$Va2=[1,373],$Vb2=[6,10,11,14,83],$Vc2=[6,10,11,14,83,127],$Vd2=[1,6,10,11,14,22,83,90,99,104,127,129,139,191,192,218,227],$Ve2=[1,6,10,11,14,22,83,90,99,104,127,129,139,191,192,204,218,227],$Vf2=[216,217],$Vg2=[14,216,217],$Vh2=[1,6,11,14,22,83,90,99,104,127,129,139,163,191,192,203,204,205,210,218,227,228,231,232,235,236,237],$Vi2=[81,84],$Vj2=[21,81,84,154,156],$Vk2=[1,6,10,11,14,22,83,90,99,104,117,127,129,139,163,191,192,203,204,205,210,218,227,228,231,232,236,237],$Vl2=[1,6,10,11,14,22,83,90,99,104,127,129,139,191,192,204,218],$Vm2=[19,20,23,24,26,32,51,53,54,56,58,60,62,64,66,67,68,69,70,71,72,73,76,82,84,89,96,104,113,114,115,122,128,135,136,143,144,146,148,149,150,167,175,176,179,184,185,188,189,195,201,203,205,207,210,219,225,229,230,231,232,233,234],$Vn2=[1,6,10,11,14,22,83,90,99,104,117,127,129,139,163,191,192,203,204,205,210,218,221,226,227,228,231,232,235,236,237],$Vo2=[11,221,223],$Vp2=[1,437],$Vq2=[2,179],$Vr2=[6,10,11],$Vs2=[1,445],$Vt2=[14,22,139],$Vu2=[1,453],$Vv2=[1,6,10,11,14,22,83,90,99,104,127,129,139,191,192,203,205,210,218,227],$Vw2=[51,58,82],$Vx2=[14,22],$Vy2=[1,477],$Vz2=[10,14],$VA2=[1,527],$VB2=[6,10];
var parser = {trace: function trace() { },
yy: {},
symbols_: {"error":2,"Root":3,"Body":4,"Block":5,"TERMINATOR":6,"BODYSTART":7,"Line":8,"Terminator":9,"INDENT":10,"OUTDENT":11,"Splat":12,"Expression":13,",":14,"Comment":15,"Statement":16,"Return":17,"Throw":18,"STATEMENT":19,"BREAK":20,"CALL_START":21,"CALL_END":22,"CONTINUE":23,"DEBUGGER":24,"ImportStatement":25,"IMPORT":26,"ImportArgList":27,"FROM":28,"ImportFrom":29,"AS":30,"ImportArg":31,"STRING":32,"VarIdentifier":33,"Await":34,"Value":35,"Code":36,"Operation":37,"Assign":38,"If":39,"Ternary":40,"Try":41,"While":42,"For":43,"Switch":44,"Class":45,"Module":46,"TagDeclaration":47,"Tag":48,"Property":49,"Identifier":50,"IDENTIFIER":51,"Ivar":52,"IVAR":53,"CVAR":54,"Gvar":55,"GVAR":56,"Const":57,"CONST":58,"Argvar":59,"ARGVAR":60,"Symbol":61,"SYMBOL":62,"AlphaNumeric":63,"NUMBER":64,"Literal":65,"JS":66,"REGEX":67,"BOOL":68,"TRUE":69,"FALSE":70,"NULL":71,"UNDEFINED":72,"RETURN":73,"Arguments":74,"TagSelector":75,"SELECTOR_START":76,"TagSelectorType":77,"SELECTOR_NS":78,"SELECTOR_ID":79,"SELECTOR_CLASS":80,".":81,"{":82,"}":83,"#":84,"SELECTOR_COMBINATOR":85,"SELECTOR_PSEUDO_CLASS":86,"SELECTOR_GROUP":87,"UNIVERSAL_SELECTOR":88,"[":89,"]":90,"SELECTOR_ATTR_OP":91,"TagSelectorAttrValue":92,"SELECTOR_TAG":93,"Selector":94,"SELECTOR_END":95,"TAG_START":96,"TagOptions":97,"TagAttributes":98,"TAG_END":99,"TagBody":100,"TagTypeName":101,"Self":102,"INDEX_START":103,"INDEX_END":104,"TagAttr":105,"OptComma":106,"TAG_ATTR":107,"=":108,"TagAttrValue":109,"ArgList":110,"TagTypeDef":111,"TagDeclarationBlock":112,"EXTEND":113,"LOCAL":114,"TAG":115,"TagType":116,"COMPARE":117,"TagDeclKeywords":118,"TAG_TYPE":119,"TAG_ID":120,"TagId":121,"IDREF":122,"Assignable":123,"Outdent":124,"AssignObj":125,"ObjAssignable":126,":":127,"(":128,")":129,"HERECOMMENT":130,"COMMENT":131,"Method":132,"Do":133,"Begin":134,"BEGIN":135,"DO":136,"BLOCK_PARAM_START":137,"ParamList":138,"BLOCK_PARAM_END":139,"PropType":140,"PropertyIdentifier":141,"Object":142,"PROP":143,"ATTR":144,"TupleAssign":145,"VAR":146,"MethodDeclaration":147,"GLOBAL":148,"EXPORT":149,"DEF":150,"MethodScope":151,"MethodScopeType":152,"MethodIdentifier":153,"DEF_BODY":154,"MethodBody":155,"DEF_FRAGMENT":156,"MethodReceiver":157,"This":158,"Param":159,"Array":160,"ParamVar":161,"SPLAT":162,"LOGIC":163,"BLOCK_ARG":164,"VarReference":165,"VarAssignable":166,"LET":167,"SimpleAssignable":168,"NEW":169,"Super":170,"SoakableOp":171,"?:":172,"IndexValue":173,"?.":174,"SUPER":175,"AWAIT":176,"Parenthetical":177,"Range":178,"ARGUMENTS":179,"Invocation":180,"Slice":181,"AssignList":182,"ClassStart":183,"CLASS":184,"MODULE":185,"OptFuncExist":186,"FUNC_EXIST":187,"THIS":188,"SELF":189,"RangeDots":190,"..":191,"...":192,"Arg":193,"SimpleArgs":194,"TRY":195,"Catch":196,"Finally":197,"FINALLY":198,"CATCH":199,"CATCH_VAR":200,"THROW":201,"WhileSource":202,"WHILE":203,"WHEN":204,"UNTIL":205,"Loop":206,"LOOP":207,"ForBody":208,"ForBlock":209,"FOR":210,"ForStart":211,"ForSource":212,"ForVariables":213,"OWN":214,"ForValue":215,"FORIN":216,"FOROF":217,"BY":218,"SWITCH":219,"Whens":220,"ELSE":221,"When":222,"LEADING_WHEN":223,"IfBlock":224,"IF":225,"ELIF":226,"POST_IF":227,"?":228,"UNARY":229,"SQRT":230,"-":231,"+":232,"--":233,"++":234,"MATH":235,"SHIFT":236,"RELATION":237,"COMPOUND_ASSIGN":238,"$accept":0,"$end":1},
terminals_: {2:"error",6:"TERMINATOR",7:"BODYSTART",10:"INDENT",11:"OUTDENT",14:",",19:"STATEMENT",20:"BREAK",21:"CALL_START",22:"CALL_END",23:"CONTINUE",24:"DEBUGGER",26:"IMPORT",28:"FROM",30:"AS",32:"STRING",51:"IDENTIFIER",53:"IVAR",54:"CVAR",56:"GVAR",58:"CONST",60:"ARGVAR",62:"SYMBOL",64:"NUMBER",66:"JS",67:"REGEX",68:"BOOL",69:"TRUE",70:"FALSE",71:"NULL",72:"UNDEFINED",73:"RETURN",76:"SELECTOR_START",78:"SELECTOR_NS",79:"SELECTOR_ID",80:"SELECTOR_CLASS",81:".",82:"{",83:"}",84:"#",85:"SELECTOR_COMBINATOR",86:"SELECTOR_PSEUDO_CLASS",87:"SELECTOR_GROUP",88:"UNIVERSAL_SELECTOR",89:"[",90:"]",91:"SELECTOR_ATTR_OP",93:"SELECTOR_TAG",95:"SELECTOR_END",96:"TAG_START",99:"TAG_END",103:"INDEX_START",104:"INDEX_END",107:"TAG_ATTR",108:"=",113:"EXTEND",114:"LOCAL",115:"TAG",117:"COMPARE",119:"TAG_TYPE",120:"TAG_ID",122:"IDREF",127:":",128:"(",129:")",130:"HERECOMMENT",131:"COMMENT",135:"BEGIN",136:"DO",137:"BLOCK_PARAM_START",139:"BLOCK_PARAM_END",143:"PROP",144:"ATTR",146:"VAR",148:"GLOBAL",149:"EXPORT",150:"DEF",154:"DEF_BODY",156:"DEF_FRAGMENT",162:"SPLAT",163:"LOGIC",164:"BLOCK_ARG",167:"LET",169:"NEW",172:"?:",174:"?.",175:"SUPER",176:"AWAIT",179:"ARGUMENTS",184:"CLASS",185:"MODULE",187:"FUNC_EXIST",188:"THIS",189:"SELF",191:"..",192:"...",195:"TRY",198:"FINALLY",199:"CATCH",200:"CATCH_VAR",201:"THROW",203:"WHILE",204:"WHEN",205:"UNTIL",207:"LOOP",210:"FOR",214:"OWN",216:"FORIN",217:"FOROF",218:"BY",219:"SWITCH",221:"ELSE",223:"LEADING_WHEN",225:"IF",226:"ELIF",227:"POST_IF",228:"?",229:"UNARY",230:"SQRT",231:"-",232:"+",233:"--",234:"++",235:"MATH",236:"SHIFT",237:"RELATION",238:"COMPOUND_ASSIGN"},
productions_: [0,[3,0],[3,1],[3,2],[4,1],[4,1],[4,3],[4,2],[9,1],[5,2],[5,3],[5,4],[8,1],[8,1],[8,3],[8,3],[8,1],[8,1],[16,1],[16,1],[16,1],[16,1],[16,4],[16,1],[16,4],[16,1],[16,1],[25,4],[25,4],[25,2],[29,1],[27,1],[27,3],[31,1],[13,1],[13,1],[13,1],[13,1],[13,1],[13,1],[13,1],[13,1],[13,1],[13,1],[13,1],[13,1],[13,1],[13,1],[13,1],[13,1],[50,1],[52,1],[52,1],[55,1],[57,1],[59,1],[61,1],[63,1],[63,1],[63,1],[65,1],[65,1],[65,1],[65,1],[65,1],[65,1],[65,1],[65,1],[17,2],[17,2],[17,1],[75,1],[75,2],[75,2],[75,2],[75,2],[75,5],[75,5],[75,2],[75,2],[75,2],[75,2],[75,4],[75,6],[77,1],[94,2],[92,1],[92,1],[92,3],[48,4],[48,5],[48,5],[101,1],[101,1],[101,0],[97,1],[97,3],[97,4],[97,3],[97,5],[97,3],[97,2],[97,5],[98,0],[98,1],[98,3],[98,4],[105,1],[105,3],[109,1],[100,3],[100,3],[111,1],[111,3],[47,1],[47,2],[47,2],[112,2],[112,3],[112,4],[112,5],[118,0],[118,1],[116,1],[116,1],[121,1],[121,2],[38,3],[38,5],[125,1],[125,3],[125,5],[125,1],[126,1],[126,1],[126,1],[126,1],[126,1],[126,3],[15,1],[15,1],[36,1],[36,1],[36,1],[134,2],[133,2],[133,5],[133,6],[49,3],[49,5],[49,2],[140,1],[140,1],[141,1],[141,3],[145,4],[132,1],[132,2],[132,2],[147,9],[147,6],[147,7],[147,4],[147,9],[147,6],[147,7],[147,4],[152,1],[152,1],[153,1],[153,1],[153,3],[155,1],[155,1],[151,1],[151,1],[151,1],[151,1],[106,0],[106,1],[138,0],[138,1],[138,3],[159,1],[159,1],[159,1],[159,2],[159,2],[159,2],[159,3],[161,1],[12,2],[165,3],[165,2],[165,2],[165,3],[165,2],[33,1],[33,1],[166,1],[166,1],[166,1],[168,1],[168,1],[168,1],[168,1],[168,1],[168,1],[168,1],[168,3],[168,3],[168,3],[168,3],[168,3],[168,3],[168,3],[168,4],[171,1],[171,1],[170,1],[123,1],[123,1],[123,1],[34,2],[35,1],[35,1],[35,1],[35,1],[35,1],[35,1],[35,1],[35,1],[35,1],[35,1],[173,1],[173,1],[142,4],[182,0],[182,1],[182,3],[182,4],[182,6],[45,1],[45,2],[45,2],[45,2],[45,2],[45,3],[183,2],[183,3],[183,4],[183,5],[46,2],[46,3],[180,3],[180,2],[186,0],[186,1],[74,2],[74,4],[158,1],[102,1],[160,2],[160,4],[190,1],[190,1],[178,5],[181,3],[181,2],[181,2],[110,1],[110,3],[110,4],[110,4],[110,6],[124,2],[124,1],[193,1],[193,1],[193,1],[193,1],[194,1],[194,3],[41,2],[41,3],[41,3],[41,4],[197,2],[196,3],[18,2],[177,3],[177,5],[202,2],[202,4],[202,2],[202,4],[42,2],[42,2],[42,2],[42,1],[206,2],[206,2],[43,2],[43,2],[43,2],[209,2],[208,2],[208,2],[211,2],[211,3],[215,1],[215,1],[215,1],[213,1],[213,3],[212,2],[212,2],[212,4],[212,4],[212,4],[212,6],[212,6],[44,5],[44,7],[44,4],[44,6],[220,1],[220,2],[222,3],[222,4],[224,3],[224,5],[224,4],[224,3],[39,1],[39,3],[39,3],[40,5],[37,2],[37,2],[37,2],[37,2],[37,2],[37,2],[37,2],[37,2],[37,2],[37,3],[37,3],[37,3],[37,3],[37,3],[37,3],[37,3],[37,3],[37,5]],
performAction: function performAction(self, yytext, yyleng, yylineno, yy, yystate /* action[1] */, $$ /* vstack */) {
/* self == yyval */

var $0 = $$.length - 1;
switch (yystate) {
case 1:
return self.$ = new yy.Root([]);
break;
case 2:
return self.$ = new yy.Root($$[$0]);
break;
case 3:
return self.$ = $$[$0-1];
break;
case 4:
self.$ = new yy.Block([]);
break;
case 5:
self.$ = new yy.Block([$$[$0]]);
break;
case 6:
self.$ = $$[$0-2].break($$[$0-1]).add($$[$0]);
break;
case 7:
self.$ = $$[$0-1].break($$[$0]);
break;
case 8:
self.$ = new yy.Terminator($$[$0]);
break;
case 9:
self.$ = new yy.Block([]).indented($$[$0-1],$$[$0]);
break;
case 10: case 110:
self.$ = $$[$0-1].indented($$[$0-2],$$[$0]);
break;
case 11:
self.$ = $$[$0-1].prebreak($$[$0-2]).indented($$[$0-3],$$[$0]);
break;
case 12: case 13: case 16: case 17: case 18: case 19: case 26: case 30: case 33: case 34: case 35: case 36: case 37: case 38: case 39: case 40: case 41: case 42: case 43: case 44: case 45: case 46: case 47: case 48: case 49: case 59: case 60: case 86: case 87: case 92: case 109: case 114: case 121: case 132: case 133: case 134: case 135: case 136: case 137: case 141: case 142: case 143: case 151: case 152: case 153: case 156: case 169: case 170: case 172: case 174: case 175: case 176: case 177: case 178: case 179: case 190: case 197: case 198: case 199: case 200: case 201: case 202: case 204: case 205: case 206: case 207: case 220: case 221: case 222: case 224: case 225: case 226: case 227: case 228: case 230: case 231: case 232: case 233: case 242: case 276: case 277: case 278: case 279: case 280: case 281: case 299: case 308: case 310: case 326: case 334:
self.$ = $$[$0];
break;
case 14: case 15:
self.$ = $$[$0-2].addExpression($$[$0]);
break;
case 20: case 61:
self.$ = new yy.Literal($$[$0]);
break;
case 21:
self.$ = new yy.BreakStatement($$[$0]);
break;
case 22:
self.$ = new yy.BreakStatement($$[$0-3],$$[$0-1]);
break;
case 23:
self.$ = new yy.ContinueStatement($$[$0]);
break;
case 24:
self.$ = new yy.ContinueStatement($$[$0-3],$$[$0-1]);
break;
case 25:
self.$ = new yy.DebuggerStatement($$[$0]);
break;
case 27:
self.$ = new yy.ImportStatement($$[$0-2],$$[$0]);
break;
case 28:
self.$ = new yy.ImportStatement(null,$$[$0-2],$$[$0]);
break;
case 29:
self.$ = new yy.ImportStatement(null,$$[$0]);
break;
case 31: case 104: case 181: case 313:
self.$ = [$$[$0]];
break;
case 32: case 105: case 182:
self.$ = $$[$0-2].concat($$[$0]);
break;
case 50:
self.$ = new yy.Identifier($$[$0]);
break;
case 51: case 52:
self.$ = new yy.Ivar($$[$0]);
break;
case 53:
self.$ = new yy.Gvar($$[$0]);
break;
case 54:
self.$ = new yy.Const($$[$0]);
break;
case 55:
self.$ = new yy.Argvar($$[$0]);
break;
case 56:
self.$ = new yy.Symbol($$[$0]);
break;
case 57:
self.$ = new yy.Num($$[$0]);
break;
case 58:
self.$ = new yy.Str($$[$0]);
break;
case 62:
self.$ = new yy.RegExp($$[$0]);
break;
case 63:
self.$ = new yy.Bool($$[$0]);
break;
case 64:
self.$ = yy.TRUE;
break;
case 65:
self.$ = yy.FALSE;
break;
case 66:
self.$ = yy.NIL;
break;
case 67:
self.$ = yy.UNDEFINED;
break;
case 68: case 69:
self.$ = new yy.Return($$[$0]);
break;
case 70:
self.$ = new yy.Return();
break;
case 71:
self.$ = new yy.Selector([],{type: $$[$0]});
break;
case 72:
self.$ = $$[$0-1].add(new yy.SelectorType($$[$0]),'tag');
break;
case 73:
self.$ = $$[$0-1].add(new yy.SelectorNamespace($$[$0]),'ns');
break;
case 74:
self.$ = $$[$0-1].add(new yy.SelectorId($$[$0]),'id');
break;
case 75:
self.$ = $$[$0-1].add(new yy.SelectorClass($$[$0]),'class');
break;
case 76:
self.$ = $$[$0-4].add(new yy.SelectorClass($$[$0-1]),'class');
break;
case 77:
self.$ = $$[$0-4].add(new yy.SelectorId($$[$0-1]),'id');
break;
case 78:
self.$ = $$[$0-1].add(new yy.SelectorCombinator($$[$0]),'sep');
break;
case 79:
self.$ = $$[$0-1].add(new yy.SelectorPseudoClass($$[$0]),'pseudoclass');
break;
case 80:
self.$ = $$[$0-1].group();
break;
case 81:
self.$ = $$[$0-1].add(new yy.SelectorUniversal($$[$0]),'universal');
break;
case 82:
self.$ = $$[$0-3].add(new yy.SelectorAttribute($$[$0-1]),'attr');
break;
case 83:
self.$ = $$[$0-5].add(new yy.SelectorAttribute($$[$0-3],$$[$0-2],$$[$0-1]),'attr');
break;
case 84: case 93: case 123: case 124:
self.$ = new yy.TagTypeIdentifier($$[$0]);
break;
case 85: case 88: case 111: case 138: case 154: case 171: case 275:
self.$ = $$[$0-1];
break;
case 89:
self.$ = $$[$0-2].set({attributes: $$[$0-1],open: $$[$0-3],close: $$[$0]});
break;
case 90:
self.$ = $$[$0-3].set({attributes: $$[$0-2],body: $$[$0],open: $$[$0-4],close: $$[$0-1]});
break;
case 91:
self.$ = new yy.TagWrapper($$[$0-2],$$[$0-4],$$[$0]);
break;
case 94:
self.$ = new yy.TagTypeIdentifier('div');
break;
case 95:
self.$ = new yy.Tag({type: $$[$0]});
break;
case 96:
self.$ = $$[$0-2].addSymbol($$[$0]);
break;
case 97:
self.$ = $$[$0-3].addIndex($$[$0-1]);
break;
case 98:
self.$ = $$[$0-2].addClass($$[$0]);
break;
case 99:
self.$ = $$[$0-4].addClass($$[$0-1]);
break;
case 100:
self.$ = $$[$0-2].set({id: $$[$0]});
break;
case 101:
self.$ = $$[$0-1].set({ivar: $$[$0]});
break;
case 102:
self.$ = $$[$0-4].set({id: $$[$0-1]});
break;
case 103: case 180:
self.$ = [];
break;
case 106:
self.$ = $$[$0-3].concat($$[$0]);
break;
case 107:
self.$ = new yy.TagAttr($$[$0],$$[$0]);
break;
case 108:
self.$ = new yy.TagAttr($$[$0-2],$$[$0]);
break;
case 112:
self.$ = new yy.TagDesc($$[$0]);
break;
case 113:
self.$ = $$[$0-2].classes($$[$0]);
break;
case 115:
self.$ = $$[$0].set({extension: true});
break;
case 116:
self.$ = $$[$0].set({local: true});
break;
case 117:
self.$ = new yy.TagDeclaration($$[$0]);
break;
case 118:
self.$ = new yy.TagDeclaration($$[$0-1],null,$$[$0]);
break;
case 119:
self.$ = new yy.TagDeclaration($$[$0-2],$$[$0]);
break;
case 120:
self.$ = new yy.TagDeclaration($$[$0-3],$$[$0-1],$$[$0]);
break;
case 122:
self.$ = ['yy.extend'];
break;
case 125: case 126:
self.$ = new yy.TagId($$[$0]);
break;
case 127:
self.$ = new yy.Assign("=",$$[$0-2],$$[$0]);
break;
case 128:
self.$ = new yy.Assign("=",$$[$0-4],$$[$0-1].indented($$[$0-2],$$[$0]));
break;
case 129:
self.$ = new yy.ObjAttr($$[$0]);
break;
case 130:
self.$ = new yy.ObjAttr($$[$0-2],$$[$0],'object');
break;
case 131:
self.$ = new yy.ObjAttr($$[$0-4],$$[$0-1].indented($$[$0-2],$$[$0]),'object');
break;
case 139:
self.$ = new yy.Comment($$[$0],true);
break;
case 140:
self.$ = new yy.Comment($$[$0],false);
break;
case 144:
self.$ = new yy.Begin($$[$0]);
break;
case 145:
self.$ = new yy.Lambda([],$$[$0],null,null,{bound: true});
break;
case 146:
self.$ = new yy.Lambda($$[$0-2],$$[$0],null,null,{bound: true});
break;
case 147:
self.$ = new yy.Lambda($$[$0-3],$$[$0-1],null,null,{bound: true});
break;
case 148:
self.$ = new yy.PropertyDeclaration($$[$0-1],$$[$0],$$[$0-2]);
break;
case 149:
self.$ = new yy.PropertyDeclaration($$[$0-3],$$[$0-1],$$[$0-4]);
break;
case 150:
self.$ = new yy.PropertyDeclaration($$[$0],null,$$[$0-1]);
break;
case 155:
self.$ = $$[$0-3];
break;
case 157: case 245:
self.$ = $$[$0].set({global: $$[$0-1]});
break;
case 158: case 196: case 246:
self.$ = $$[$0].set({export: $$[$0-1]});
break;
case 159:
self.$ = new yy.MethodDeclaration($$[$0-3],$$[$0],$$[$0-5],$$[$0-7],$$[$0-6]);
break;
case 160:
self.$ = new yy.MethodDeclaration([],$$[$0],$$[$0-2],$$[$0-4],$$[$0-3]);
break;
case 161:
self.$ = new yy.MethodDeclaration($$[$0-3],$$[$0],$$[$0-5],null);
break;
case 162:
self.$ = new yy.MethodDeclaration([],$$[$0],$$[$0-2],null);
break;
case 163:
self.$ = new yy.MethodDeclaration($$[$0-3],$$[$0],$$[$0-5],$$[$0-7],$$[$0-6]).set({greedy: true});
break;
case 164:
self.$ = new yy.MethodDeclaration([],$$[$0],$$[$0-2],$$[$0-4],$$[$0-3]).set({greedy: true});
break;
case 165:
self.$ = new yy.MethodDeclaration($$[$0-3],$$[$0],$$[$0-5],null).set({greedy: true});
break;
case 166:
self.$ = new yy.MethodDeclaration([],$$[$0],$$[$0-2],null).set({greedy: true});
break;
case 167:
self.$ = {static: true};
break;
case 168:
self.$ = {};
break;
case 173:
self.$ = $$[$0].body();
break;
case 183:
self.$ = new yy.NamedParams($$[$0]);
break;
case 184:
self.$ = new yy.ArrayParams($$[$0]);
break;
case 185:
self.$ = new yy.RequiredParam($$[$0]);
break;
case 186:
self.$ = new yy.SplatParam($$[$0],null,$$[$0-1]);
break;
case 187: case 188:
self.$ = new yy.BlockParam($$[$0],null,$$[$0-1]);
break;
case 189:
self.$ = new yy.OptionalParam($$[$0-2],$$[$0],$$[$0-1]);
break;
case 191:
self.$ = yy.SPLAT($$[$0]);
break;
case 192: case 195:
self.$ = yy.SPLAT(new yy.VarReference($$[$0],$$[$0-2]),$$[$0-1]);
break;
case 193: case 194:
self.$ = new yy.VarReference($$[$0],$$[$0-1]);
break;
case 203:
self.$ = new yy.IvarAccess('.',null,$$[$0]);
break;
case 208:
self.$ = new yy.VarOrAccess($$[$0]);
break;
case 209:
self.$ = new yy.New($$[$0-2]);
break;
case 210:
self.$ = new yy.SuperAccess('.',$$[$0-2],$$[$0]);
break;
case 211:
self.$ = new yy.PropertyAccess($$[$0-1],$$[$0-2],$$[$0]);
break;
case 212: case 213: case 215:
self.$ = new yy.Access($$[$0-1],$$[$0-2],$$[$0]);
break;
case 214:
self.$ = new yy.Access('.',$$[$0-2],new yy.Identifier($$[$0].value()));
break;
case 216:
self.$ = new yy.IndexAccess('.',$$[$0-3],$$[$0-1]);
break;
case 219:
self.$ = yy.SUPER;
break;
case 223:
self.$ = new yy.Await($$[$0]);
break;
case 229:
self.$ = yy.ARGUMENTS;
break;
case 234:
self.$ = new yy.Index($$[$0]);
break;
case 235:
self.$ = new yy.Slice($$[$0]);
break;
case 236:
self.$ = new yy.Obj($$[$0-2],$$[$0-3].generated);
break;
case 237:
self.$ = new yy.AssignList([]);
break;
case 238:
self.$ = new yy.AssignList([$$[$0]]);
break;
case 239: case 271:
self.$ = $$[$0-2].add($$[$0]);
break;
case 240: case 272:
self.$ = $$[$0-3].add($$[$0-1]).add($$[$0]);
break;
case 241:
self.$ = $$[$0-5].concat($$[$0-2].indented($$[$0-3],$$[$0]));
break;
case 243:
self.$ = $$[$0].set({extension: $$[$0-1]});
break;
case 244:
self.$ = $$[$0].set({local: $$[$0-1]});
break;
case 247:
self.$ = $$[$0].set({export: $$[$0-2],local: $$[$0-1]});
break;
case 248:
self.$ = new yy.ClassDeclaration($$[$0],null,[]);
break;
case 249:
self.$ = new yy.ClassDeclaration($$[$0-1],null,$$[$0]);
break;
case 250:
self.$ = new yy.ClassDeclaration($$[$0-2],$$[$0],[]);
break;
case 251:
self.$ = new yy.ClassDeclaration($$[$0-3],$$[$0-1],$$[$0]);
break;
case 252:
self.$ = new yy.Module($$[$0]);
break;
case 253:
self.$ = new yy.Module($$[$0-1],null,$$[$0]);
break;
case 254:
self.$ = new yy.Call($$[$0-2],$$[$0],$$[$0-1]);
break;
case 255:
self.$ = $$[$0-1].addBlock($$[$0]);
break;
case 256:
self.$ = false;
break;
case 257:
self.$ = true;
break;
case 258:
self.$ = new yy.ArgList([]);
break;
case 259:
self.$ = $$[$0-2];
break;
case 260:
self.$ = new yy.This($$[$0]);
break;
case 261:
self.$ = new yy.Self($$[$0]);
break;
case 262:
self.$ = new yy.Arr(new yy.ArgList([]));
break;
case 263:
self.$ = new yy.Arr($$[$0-2]);
break;
case 264:
self.$ = '..';
break;
case 265:
self.$ = '...';
break;
case 266:
self.$ = yy.OP($$[$0-2],$$[$0-3],$$[$0-1]);
break;
case 267:
self.$ = new yy.Range($$[$0-2],$$[$0],$$[$0-1]);
break;
case 268:
self.$ = new yy.Range($$[$0-1],null,$$[$0]);
break;
case 269:
self.$ = new yy.Range(null,$$[$0],$$[$0-1]);
break;
case 270:
self.$ = new yy.ArgList([$$[$0]]);
break;
case 273:
self.$ = $$[$0-2].indented($$[$0-3],$$[$0]);
break;
case 274:
self.$ = $$[$0-5].concat($$[$0-2]);
break;
case 282:
self.$ = [].concat($$[$0-2],$$[$0]);
break;
case 283:
self.$ = new yy.Try($$[$0]);
break;
case 284:
self.$ = new yy.Try($$[$0-1],$$[$0]);
break;
case 285:
self.$ = new yy.Try($$[$0-1],null,$$[$0]);
break;
case 286:
self.$ = new yy.Try($$[$0-2],$$[$0-1],$$[$0]);
break;
case 287:
self.$ = new yy.Finally($$[$0]);
break;
case 288:
self.$ = new yy.Catch($$[$0],$$[$0-1]);
break;
case 289:
self.$ = new yy.Throw($$[$0]);
break;
case 290:
self.$ = new yy.Parens($$[$0-1]);
break;
case 291:
self.$ = new yy.Parens($$[$0-2]);
break;
case 292:
self.$ = new yy.While($$[$0]);
break;
case 293:
self.$ = new yy.While($$[$0-2],{guard: $$[$0]});
break;
case 294:
self.$ = new yy.While($$[$0],{invert: true});
break;
case 295:
self.$ = new yy.While($$[$0-2],{invert: true,guard: $$[$0]});
break;
case 296: case 304: case 305:
self.$ = $$[$0-1].addBody($$[$0]);
break;
case 297: case 298:
self.$ = $$[$0].addBody(yy.Block.wrap([$$[$0-1]]));
break;
case 300:
self.$ = new yy.While(new yy.Literal('true')).addBody($$[$0]);
break;
case 301:
self.$ = new yy.While(new yy.Literal('true')).addBody(yy.Block.wrap([$$[$0]]));
break;
case 302: case 303:
self.$ = $$[$0].addBody([$$[$0-1]]);
break;
case 306:
self.$ = {source: new yy.ValueNode($$[$0])};
break;
case 307:
self.$ = $$[$0].configure({own: $$[$0-1].own,name: $$[$0-1][0],index: $$[$0-1][1]});
break;
case 309:
self.$ = ($$[$0].own = true) && $$[$0];
break;
case 311: case 312:
self.$ = new yy.ValueNode($$[$0]);
break;
case 314:
self.$ = [$$[$0-2],$$[$0]];
break;
case 315:
self.$ = new yy.ForIn({source: $$[$0]});
break;
case 316:
self.$ = new yy.ForOf({source: $$[$0],object: true});
break;
case 317:
self.$ = new yy.ForIn({source: $$[$0-2],guard: $$[$0]});
break;
case 318:
self.$ = new yy.ForOf({source: $$[$0-2],guard: $$[$0],object: true});
break;
case 319:
self.$ = new yy.ForIn({source: $$[$0-2],step: $$[$0]});
break;
case 320:
self.$ = new yy.ForIn({source: $$[$0-4],guard: $$[$0-2],step: $$[$0]});
break;
case 321:
self.$ = new yy.ForIn({source: $$[$0-4],step: $$[$0-2],guard: $$[$0]});
break;
case 322:
self.$ = new yy.Switch($$[$0-3],$$[$0-1]);
break;
case 323:
self.$ = new yy.Switch($$[$0-5],$$[$0-3],$$[$0-1]);
break;
case 324:
self.$ = new yy.Switch(null,$$[$0-1]);
break;
case 325:
self.$ = new yy.Switch(null,$$[$0-3],$$[$0-1]);
break;
case 327:
self.$ = $$[$0-1].concat($$[$0]);
break;
case 328:
self.$ = [new yy.SwitchCase($$[$0-1],$$[$0])];
break;
case 329:
self.$ = [new yy.SwitchCase($$[$0-2],$$[$0-1])];
break;
case 330:
self.$ = new yy.If($$[$0-1],$$[$0],{type: $$[$0-2]});
break;
case 331:
self.$ = $$[$0-4].addElse(new yy.If($$[$0-1],$$[$0],{type: $$[$0-2]}));
break;
case 332:
self.$ = $$[$0-3].addElse(new yy.If($$[$0-1],$$[$0],{type: $$[$0-2]}));
break;
case 333:
self.$ = $$[$0-2].addElse($$[$0]);
break;
case 335:
self.$ = new yy.If($$[$0],new yy.Block([$$[$0-2]]),{type: $$[$0-1],statement: true});
break;
case 336:
self.$ = new yy.If($$[$0],new yy.Block([$$[$0-2]]),{type: $$[$0-1]});
break;
case 337:
self.$ = yy.If.ternary($$[$0-4],$$[$0-2],$$[$0]);
break;
case 338: case 339:
self.$ = yy.OP($$[$0-1],$$[$0]);
break;
case 340:
self.$ = new yy.Op('-',$$[$0]);
break;
case 341:
self.$ = new yy.Op('+',$$[$0]);
break;
case 342:
self.$ = new yy.UnaryOp('--',null,$$[$0]);
break;
case 343:
self.$ = new yy.UnaryOp('++',null,$$[$0]);
break;
case 344:
self.$ = new yy.UnaryOp('--',$$[$0-1],null,true);
break;
case 345:
self.$ = new yy.UnaryOp('++',$$[$0-1],null,true);
break;
case 346:
self.$ = new yy.Existence($$[$0-1]);
break;
case 347:
self.$ = new yy.Op('+',$$[$0-2],$$[$0]);
break;
case 348:
self.$ = new yy.Op('-',$$[$0-2],$$[$0]);
break;
case 349: case 350: case 351: case 352:
self.$ = yy.OP($$[$0-1],$$[$0-2],$$[$0]);
break;
case 353:
self.$ = (function () {
				if ($$[$0-1].charAt(0) == '!') {
					return yy.OP($$[$0-1].slice(1),$$[$0-2],$$[$0]).invert();
				} else {
					return yy.OP($$[$0-1],$$[$0-2],$$[$0]);
				};
			}());
break;
case 354:
self.$ = yy.OP_COMPOUND($$[$0-1]._value,$$[$0-1],$$[$0-2],$$[$0]);
break;
case 355:
self.$ = yy.OP_COMPOUND($$[$0-3]._value,$$[$0-4],$$[$0-1].indented($$[$0-2],$$[$0]));
break;
}
},
table: [{1:[2,1],3:1,4:2,5:3,7:$V0,8:5,10:$V1,12:7,13:8,15:9,16:10,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,130:$Vy,131:$Vz,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,162:$VI,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},{1:[3]},{1:[2,2],6:$V31,9:129},{6:[1,131]},o($V41,[2,4]),o($V41,[2,5],{14:$V51}),{4:134,6:[1,135],7:$V0,8:5,11:[1,133],12:7,13:8,15:9,16:10,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,130:$Vy,131:$Vz,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,162:$VI,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},o($V61,[2,12]),o($V61,[2,13],{211:109,202:145,208:146,117:$V71,163:$V81,203:$VT,205:$VU,210:$VW,227:$V91,228:$Va1,231:$Vb1,232:$Vc1,235:$Vd1,236:$Ve1,237:$Vf1}),o($V61,[2,16]),o($V61,[2,17],{211:109,202:148,208:149,203:$VT,205:$VU,210:$VW,227:$Vg1}),{13:150,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},o($Vh1,[2,34]),o($Vh1,[2,35],{186:152,133:153,171:155,21:$Vi1,81:$Vj1,82:$Vk1,103:$Vl1,136:$VB,172:$Vm1,174:$Vn1,187:$Vo1}),o($Vh1,[2,36]),o($Vh1,[2,37]),o($Vh1,[2,38]),o($Vh1,[2,39]),o($Vh1,[2,40]),o($Vh1,[2,41]),o($Vh1,[2,42]),o($Vh1,[2,43]),o($Vh1,[2,44]),o($Vh1,[2,45]),o($Vh1,[2,46]),o($Vh1,[2,47]),o($Vh1,[2,48]),o($Vh1,[2,49]),o($Vp1,[2,139]),o($Vp1,[2,140]),o($Vq1,[2,18]),o($Vq1,[2,19]),o($Vq1,[2,20]),o($Vq1,[2,21],{21:[1,161]}),o($Vq1,[2,23],{21:[1,162]}),o($Vq1,[2,25]),o($Vq1,[2,26]),{13:163,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},o($Vr1,$Vs1,{108:[1,164]}),o($Vr1,[2,225]),o($Vr1,[2,226]),o($Vr1,[2,227]),o($Vr1,[2,228]),o($Vr1,[2,229]),o($Vr1,[2,230]),o($Vr1,[2,231]),o($Vr1,[2,232]),o($Vr1,[2,233]),o($Vh1,[2,141]),o($Vh1,[2,142]),o($Vh1,[2,143]),{13:165,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},{13:166,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},{13:167,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},{13:168,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},{32:$V7,35:170,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,75:92,76:$Vo,82:$Vt1,84:$Vq,89:$Vr,94:46,102:101,121:45,122:$Vw,123:172,128:$Vx,142:77,146:$VE,149:$Vu1,158:44,160:76,165:102,167:$VJ,168:169,170:39,175:$VK,177:41,178:42,179:$VM,180:47,188:$VP,189:$VQ},{32:$V7,35:170,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,75:92,76:$Vo,82:$Vt1,84:$Vq,89:$Vr,94:46,102:101,121:45,122:$Vw,123:172,128:$Vx,142:77,146:$VE,149:$Vu1,158:44,160:76,165:102,167:$VJ,168:174,170:39,175:$VK,177:41,178:42,179:$VM,180:47,188:$VP,189:$VQ},o($Vv1,$Vw1,{233:[1,175],234:[1,176],238:[1,177]}),o($Vh1,[2,334],{221:[1,178],226:[1,179]}),{5:180,10:$V1},{5:181,10:$V1},o($Vh1,[2,299]),{5:182,10:$V1},{10:[1,184],13:183,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},o($Vh1,[2,242]),{112:186,115:$Vv,183:185,184:$VN},{112:188,115:$Vv,183:187,184:$VN},{147:190,150:$VH,183:189,184:$VN},{114:[1,192],146:$VE,147:193,149:$Vu1,150:$VH,165:194,167:$VJ,183:191,184:$VN},{32:$V7,35:170,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,75:92,76:$Vo,82:$Vt1,84:$Vq,89:$Vr,94:46,102:101,121:45,122:$Vw,123:172,128:$Vx,142:77,146:$VE,149:$Vu1,158:44,160:76,165:102,167:$VJ,168:195,170:39,175:$VK,177:41,178:42,179:$VM,180:47,188:$VP,189:$VQ},o($Vh1,[2,114]),o($Vx1,[2,94],{97:196,101:198,102:199,51:[1,200],82:[1,197],189:$VQ}),{50:202,51:$V8,82:[1,203],141:201},o($Vq1,[2,70],{34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,17:30,18:31,25:36,123:38,170:39,65:40,177:41,178:42,158:44,121:45,94:46,180:47,132:48,133:49,134:50,168:57,224:58,202:60,206:61,208:62,183:64,112:70,140:72,160:76,142:77,63:79,75:92,147:93,57:97,52:98,55:99,59:100,102:101,165:102,50:103,211:109,61:116,16:151,13:204,74:205,19:$V2,20:$V3,21:$Vy1,23:$V4,24:$V5,26:$V6,32:$V7,51:$V8,53:$V9,54:$Va,56:$Vb,58:$Vc,60:$Vd,62:$Ve,64:$Vf,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,76:$Vo,82:$Vp,84:$Vq,89:$Vr,96:$Vs,113:$Vt,114:$Vu,115:$Vv,122:$Vw,128:$Vx,135:$VA,136:$VB,143:$VC,144:$VD,146:$VE,148:$VF,149:$VG,150:$VH,167:$VJ,175:$VK,176:$VL,179:$VM,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,207:$VV,219:$VX,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21}),{13:207,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},{27:208,29:209,31:210,32:$Vz1,33:212,50:214,51:$V8,57:213,58:$Vc},o($Vv1,[2,221]),o($Vv1,[2,222]),o($VA1,[2,219]),o($Vr1,[2,60]),o($Vr1,[2,61]),o($Vr1,[2,62]),o($Vr1,[2,63]),o($Vr1,[2,64]),o($Vr1,[2,65]),o($Vr1,[2,66]),o($Vr1,[2,67]),{4:215,7:$V0,8:5,10:[1,216],12:7,13:8,15:9,16:10,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,130:$Vy,131:$Vz,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,162:$VI,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},{10:$VB1,12:222,13:217,15:224,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,90:$VC1,94:46,96:$Vs,102:101,110:219,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,130:$Vy,131:$Vz,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,162:$VI,163:$VD1,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,193:220,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},o([1,6,10,11,14,21,22,81,82,83,84,90,99,103,104,117,127,129,136,139,163,172,174,187,191,192,203,204,205,210,218,227,228,231,232,235,236,237],[2,260]),o($Vr1,[2,125]),{50:225,51:$V8},{77:227,78:[1,228],79:[1,229],80:[1,230],81:[1,231],84:[1,232],85:[1,233],86:[1,234],87:[1,235],88:[1,236],89:[1,237],93:[1,238],95:[1,226]},o($Vh1,[2,156]),{5:239,10:$V1,137:[1,240]},o($VE1,$VF1,{61:116,182:242,125:243,126:244,15:245,50:246,57:247,63:248,52:249,55:250,32:$V7,51:$V8,53:$V9,54:$Va,56:$Vb,58:$Vc,62:$Ve,64:$Vf,128:$VG1,130:$Vy,131:$Vz,137:$VH1}),{5:252,10:$V1},o($VA1,[2,202]),o($VA1,[2,203]),o($VA1,[2,204]),o($VA1,[2,205]),o($VA1,[2,206]),o($VA1,[2,207]),o($VA1,[2,208]),{13:253,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},{13:254,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},{13:255,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},{5:256,10:$V1,13:257,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},{50:262,51:$V8,82:$Vt1,89:$Vr,142:264,160:263,178:258,213:259,214:[1,260],215:261},{212:265,216:[1,266],217:[1,267]},{32:$V7,35:170,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,75:92,76:$Vo,82:$Vt1,84:$Vq,89:$Vr,94:46,102:101,121:45,122:$Vw,123:172,128:$Vx,142:77,146:$VE,149:$Vu1,158:44,160:76,165:102,167:$VJ,168:268,170:39,175:$VK,177:41,178:42,179:$VM,180:47,188:$VP,189:$VQ},{116:269,119:$VI1,120:$VJ1},o($VK1,[2,151]),o($VK1,[2,152]),o($Vr1,[2,57]),o($Vr1,[2,58]),o($Vr1,[2,59]),o($VL1,[2,71]),{50:277,51:$V8,55:276,56:$Vb,57:278,58:$Vc,82:$VM1,102:275,151:272,153:273,158:274,188:$VP,189:$VQ},o([1,6,10,11,14,21,22,28,81,82,83,84,90,99,103,104,108,117,127,129,136,139,154,156,163,172,174,187,191,192,203,204,205,210,218,227,228,231,232,233,234,235,236,237,238],[2,54]),o($VN1,[2,51]),o($VN1,[2,52]),o([1,6,10,11,14,21,22,81,82,83,84,90,99,103,104,108,117,127,129,136,139,163,172,174,187,191,192,203,204,205,210,218,227,228,231,232,233,234,235,236,237,238],[2,53]),o($VA1,[2,55]),o($VN1,[2,261]),{50:283,51:$V8,57:282,58:$Vc,89:$VO1,160:284,162:[1,280],166:281},{50:283,51:$V8,57:282,58:$Vc,89:$VO1,160:284,162:[1,287],166:286},o([1,6,10,11,14,21,22,28,81,82,83,84,90,91,99,103,104,108,117,127,129,136,139,154,156,163,172,174,187,191,192,203,204,205,210,216,217,218,227,228,231,232,233,234,235,236,237,238],[2,50]),o($VA1,[2,56]),o($V41,[2,7],{12:7,13:8,15:9,16:10,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,17:30,18:31,25:36,123:38,170:39,65:40,177:41,178:42,158:44,121:45,94:46,180:47,132:48,133:49,134:50,168:57,224:58,202:60,206:61,208:62,183:64,112:70,140:72,160:76,142:77,63:79,75:92,147:93,57:97,52:98,55:99,59:100,102:101,165:102,50:103,211:109,61:116,8:288,19:$V2,20:$V3,23:$V4,24:$V5,26:$V6,32:$V7,51:$V8,53:$V9,54:$Va,56:$Vb,58:$Vc,60:$Vd,62:$Ve,64:$Vf,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,76:$Vo,82:$Vp,84:$Vq,89:$Vr,96:$Vs,113:$Vt,114:$Vu,115:$Vv,122:$Vw,128:$Vx,130:$Vy,131:$Vz,135:$VA,136:$VB,143:$VC,144:$VD,146:$VE,148:$VF,149:$VG,150:$VH,162:$VI,167:$VJ,175:$VK,176:$VL,179:$VM,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,203:$VT,205:$VU,207:$VV,210:$VW,219:$VX,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21}),o([1,6,11,19,20,23,24,26,32,51,53,54,56,58,60,62,64,66,67,68,69,70,71,72,73,76,82,84,89,96,113,114,115,122,128,129,130,131,135,136,143,144,146,148,149,150,162,163,167,175,176,179,184,185,188,189,195,201,203,205,207,210,219,225,229,230,231,232,233,234],[2,8]),{1:[2,3]},{12:290,13:289,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,162:$VI,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},o($VP1,[2,9]),{6:$V31,9:129,11:[1,291]},{4:292,7:$V0,8:5,12:7,13:8,15:9,16:10,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,130:$Vy,131:$Vz,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,162:$VI,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},o([1,6,10,11,14,22,83,90,99,104,117,127,129,139,163,191,192,203,204,205,210,218,227,228,235,236,237],[2,346],{34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,17:30,18:31,25:36,123:38,170:39,65:40,177:41,178:42,158:44,121:45,94:46,180:47,132:48,133:49,134:50,168:57,224:58,202:60,206:61,208:62,183:64,112:70,140:72,160:76,142:77,63:79,75:92,147:93,57:97,52:98,55:99,59:100,102:101,165:102,50:103,211:109,61:116,16:151,13:293,19:$V2,20:$V3,23:$V4,24:$V5,26:$V6,32:$V7,51:$V8,53:$V9,54:$Va,56:$Vb,58:$Vc,60:$Vd,62:$Ve,64:$Vf,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,76:$Vo,82:$Vp,84:$Vq,89:$Vr,96:$Vs,113:$Vt,114:$Vu,115:$Vv,122:$Vw,128:$Vx,135:$VA,136:$VB,143:$VC,144:$VD,146:$VE,148:$VF,149:$VG,150:$VH,167:$VJ,175:$VK,176:$VL,179:$VM,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,207:$VV,219:$VX,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21}),{13:294,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},{13:295,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},{13:296,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},{13:297,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},{13:298,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},{13:299,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},{13:300,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},{13:301,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},o($Vh1,[2,298]),o($Vh1,[2,303]),{13:302,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},o($Vh1,[2,297]),o($Vh1,[2,302]),o([1,6,10,11,14,22,90,129],[2,191],{211:109,202:145,208:146,117:$V71,163:$V81,203:$VT,205:$VU,210:$VW,227:$V91,228:$Va1,231:$Vb1,232:$Vc1,235:$Vd1,236:$Ve1,237:$Vf1}),{202:148,203:$VT,205:$VU,208:149,210:$VW,211:109,227:$Vg1},{21:$Vy1,74:303},o($Vr1,[2,255]),o($VQ1,[2,217],{170:305,61:306,62:$Ve,169:[1,304],175:$VK}),{50:307,51:$V8,52:308,53:$V9,54:$Va,57:309,58:$Vc},{50:310,51:$V8},{13:312,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,173:311,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,181:313,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,190:314,191:$VR1,192:$VS1,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},{21:[2,257]},{137:$VH1},o($VQ1,[2,218]),{13:317,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},{13:318,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},o($VT1,[2,223],{211:109,202:145,208:146,117:$V71,163:$V81,228:$Va1,231:$Vb1,232:$Vc1,235:$Vd1,236:$Ve1,237:$Vf1}),{10:[1,320],13:319,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},o($Vh1,[2,338],{211:109,202:145,208:146}),o($Vh1,[2,339],{211:109,202:145,208:146}),o($Vh1,[2,340],{211:109,202:145,208:146}),o($Vh1,[2,341],{211:109,202:145,208:146}),o($Vh1,[2,342],{21:$Vw1,81:$Vw1,82:$Vw1,103:$Vw1,136:$Vw1,172:$Vw1,174:$Vw1,187:$Vw1}),{21:$Vi1,81:$Vj1,82:$Vk1,103:$Vl1,133:153,136:$VB,171:155,172:$Vm1,174:$Vn1,186:152,187:$Vo1},{146:$VE,149:$Vu1,165:194,167:$VJ},o([21,81,82,103,136,172,174,187],$Vs1),o($VE1,$VF1,{61:116,182:242,125:243,126:244,15:245,50:246,57:247,63:248,52:249,55:250,32:$V7,51:$V8,53:$V9,54:$Va,56:$Vb,58:$Vc,62:$Ve,64:$Vf,128:$VG1,130:$Vy,131:$Vz}),o($Vh1,[2,343],{21:$Vw1,81:$Vw1,82:$Vw1,103:$Vw1,136:$Vw1,172:$Vw1,174:$Vw1,187:$Vw1}),o($Vh1,[2,344]),o($Vh1,[2,345]),{10:[1,322],13:321,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},{5:324,10:$V1,225:[1,323]},{13:325,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},o($Vh1,[2,283],{196:326,197:327,198:$VU1,199:[1,328]}),o($Vh1,[2,296]),o($Vh1,[2,304]),{10:[1,330],117:$V71,163:$V81,202:145,203:$VT,205:$VU,208:146,210:$VW,211:109,227:$V91,228:$Va1,231:$Vb1,232:$Vc1,235:$Vd1,236:$Ve1,237:$Vf1},{220:331,222:332,223:$VV1},o($Vh1,[2,243]),o($Vh1,[2,115]),o($Vh1,[2,244]),o($Vh1,[2,116]),o($Vh1,[2,245]),o($Vh1,[2,157]),o($Vh1,[2,246]),{183:334,184:$VN},o($Vh1,[2,158]),o($VA1,[2,196]),o($VW1,[2,252],{5:335,10:$V1,21:$Vw1,81:$Vw1,82:$Vw1,103:$Vw1,136:$Vw1,172:$Vw1,174:$Vw1,187:$Vw1}),o($VX1,[2,103],{98:336,52:340,105:341,53:$V9,54:$Va,81:[1,337],84:[1,339],103:[1,338],107:$VY1}),{13:343,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},o($Vx1,[2,95]),o($Vx1,[2,92]),o($Vx1,[2,93]),o($Vh1,[2,150],{142:344,21:[1,345],82:$Vt1}),o($VZ1,[2,153]),{13:346,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},o($Vq1,[2,68],{211:109,202:145,208:146,117:$V71,163:$V81,228:$Va1,231:$Vb1,232:$Vc1,235:$Vd1,236:$Ve1,237:$Vf1}),o($Vq1,[2,69]),{10:$VB1,12:222,13:349,15:224,16:151,17:30,18:31,19:$V2,20:$V3,22:[1,347],23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,110:348,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,130:$Vy,131:$Vz,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,162:$VI,163:$VD1,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,193:220,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},o($Vq1,[2,289],{211:109,202:145,208:146,117:$V71,163:$V81,228:$Va1,231:$Vb1,232:$Vc1,235:$Vd1,236:$Ve1,237:$Vf1}),{14:[1,351],28:[1,350]},o($Vq1,[2,29],{30:[1,352]}),o($V_1,[2,31]),o([1,6,11,14,30,129,203,205,210,227],[2,30]),o($V$1,[2,33]),o($V$1,[2,197]),o($V$1,[2,198]),{6:$V31,9:129,129:[1,353]},{4:354,7:$V0,8:5,12:7,13:8,15:9,16:10,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,130:$Vy,131:$Vz,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,162:$VI,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},o([6,10,14,90],$V02,{211:109,202:145,208:146,190:355,117:$V71,163:$V81,191:$VR1,192:$VS1,203:$VT,205:$VU,210:$VW,227:$V91,228:$Va1,231:$Vb1,232:$Vc1,235:$Vd1,236:$Ve1,237:$Vf1}),o($V12,[2,262]),o([6,10,90],$V22,{106:356,14:$V32}),o($V42,[2,270]),{10:$VB1,12:222,13:349,15:224,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,110:358,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,130:$Vy,131:$Vz,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,162:$VI,163:$VD1,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,193:220,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},o($V42,[2,278]),o($V42,[2,279]),o($V42,[2,280]),o($Vr1,[2,126]),o($Vr1,[2,85]),o($VL1,[2,72]),o($VL1,[2,73]),o($VL1,[2,74]),o($VL1,[2,75]),{82:[1,359]},{82:[1,360]},o($VL1,[2,78]),o($VL1,[2,79]),o($VL1,[2,80]),o($VL1,[2,81]),{50:361,51:$V8},o($VL1,[2,84]),o($Vr1,[2,145]),o($V52,$V62,{138:362,159:363,142:364,160:365,161:366,50:370,51:$V8,82:$Vt1,89:$VO1,162:$V72,163:$V82,164:$V92}),o($V52,$V62,{159:363,142:364,160:365,161:366,50:370,138:371,51:$V8,82:$Vt1,89:$VO1,162:$V72,163:$V82,164:$V92}),o([6,10,83],$V22,{106:372,14:$Va2}),o($Vb2,[2,238]),o($Vb2,[2,129],{127:[1,374]}),o($Vb2,[2,132]),o($Vc2,[2,133]),o($Vc2,[2,134]),o($Vc2,[2,135]),o($Vc2,[2,136]),o($Vc2,[2,137]),{13:375,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},o($Vh1,[2,144]),{5:376,10:$V1,117:$V71,163:$V81,202:145,203:$VT,205:$VU,208:146,210:$VW,211:109,227:$V91,228:$Va1,231:$Vb1,232:$Vc1,235:$Vd1,236:$Ve1,237:$Vf1},o($Vd2,[2,292],{211:109,202:145,208:146,117:$V71,163:$V81,203:$VT,204:[1,377],205:$VU,210:$VW,228:$Va1,231:$Vb1,232:$Vc1,235:$Vd1,236:$Ve1,237:$Vf1}),o($Vd2,[2,294],{211:109,202:145,208:146,117:$V71,163:$V81,203:$VT,204:[1,378],205:$VU,210:$VW,228:$Va1,231:$Vb1,232:$Vc1,235:$Vd1,236:$Ve1,237:$Vf1}),o($Vh1,[2,300]),o($Ve2,[2,301],{211:109,202:145,208:146,117:$V71,163:$V81,203:$VT,205:$VU,210:$VW,228:$Va1,231:$Vb1,232:$Vc1,235:$Vd1,236:$Ve1,237:$Vf1}),o($Vh1,[2,306]),o($Vf2,[2,308]),{50:262,51:$V8,82:$Vt1,89:$VO1,142:264,160:263,213:379,215:261},o($Vf2,[2,313],{14:[1,380]}),o($Vg2,[2,310]),o($Vg2,[2,311]),o($Vg2,[2,312]),o($Vh1,[2,307]),{13:381,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},{13:382,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},o($Vh2,[2,248],{5:383,10:$V1,21:$Vw1,81:$Vw1,82:$Vw1,103:$Vw1,136:$Vw1,172:$Vw1,174:$Vw1,187:$Vw1,117:[1,384]}),o($Vh2,[2,117],{5:385,10:$V1,117:[1,386]}),o($Vh1,[2,123]),o($Vh1,[2,124]),{81:[1,388],84:[1,389],152:387},o($Vi2,[2,174],{21:[1,390],154:[1,391],156:[1,392]}),o($Vi2,[2,175]),o($Vi2,[2,176]),o($Vi2,[2,177]),o($Vj2,[2,169]),o($Vj2,[2,170]),{13:393,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},{50:283,51:$V8,57:282,58:$Vc,89:$VO1,160:284,166:394},o($VA1,[2,193]),o($VA1,[2,199]),o($VA1,[2,200]),o($VA1,[2,201]),{10:$VB1,12:222,13:349,15:224,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,90:$VC1,94:46,96:$Vs,102:101,110:219,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,130:$Vy,131:$Vz,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,162:$VI,163:$VD1,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,193:220,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},o($VA1,[2,194]),{50:283,51:$V8,57:282,58:$Vc,89:$VO1,160:284,166:395},o($V41,[2,6],{14:$V51}),o($V61,[2,14],{211:109,202:145,208:146,117:$V71,163:$V81,203:$VT,205:$VU,210:$VW,227:$V91,228:$Va1,231:$Vb1,232:$Vc1,235:$Vd1,236:$Ve1,237:$Vf1}),o($V61,[2,15]),o($VP1,[2,10]),{6:$V31,9:129,11:[1,396]},{117:$V71,127:[1,397],163:$V81,202:145,203:$VT,205:$VU,208:146,210:$VW,211:109,227:$V91,228:$Va1,231:$Vb1,232:$Vc1,235:$Vd1,236:$Ve1,237:$Vf1},o($Vk2,[2,347],{211:109,202:145,208:146,235:$Vd1}),o($Vk2,[2,348],{211:109,202:145,208:146,235:$Vd1}),o($Vh1,[2,349],{211:109,202:145,208:146}),o([1,6,10,11,14,22,83,90,99,104,117,127,129,139,163,191,192,203,204,205,210,218,227,228,236,237],[2,350],{211:109,202:145,208:146,231:$Vb1,232:$Vc1,235:$Vd1}),o([1,6,10,11,14,22,83,90,99,104,117,127,129,139,163,191,192,203,204,205,210,218,227,228],[2,351],{211:109,202:145,208:146,231:$Vb1,232:$Vc1,235:$Vd1,236:$Ve1,237:$Vf1}),o([1,6,10,11,14,22,83,90,99,104,127,129,139,163,191,192,203,204,205,210,218,227,228],[2,352],{211:109,202:145,208:146,117:$V71,231:$Vb1,232:$Vc1,235:$Vd1,236:$Ve1,237:$Vf1}),o([1,6,10,11,14,22,83,90,99,104,117,127,129,139,163,191,192,203,204,205,210,218,227,228,237],[2,353],{211:109,202:145,208:146,231:$Vb1,232:$Vc1,235:$Vd1,236:$Ve1}),o($Vl2,[2,336],{211:109,202:145,208:146,117:$V71,163:$V81,203:$VT,205:$VU,210:$VW,227:$V91,228:$Va1,231:$Vb1,232:$Vc1,235:$Vd1,236:$Ve1,237:$Vf1}),o($Vl2,[2,335],{211:109,202:145,208:146,117:$V71,163:$V81,203:$VT,205:$VU,210:$VW,227:$V91,228:$Va1,231:$Vb1,232:$Vc1,235:$Vd1,236:$Ve1,237:$Vf1}),o($Vr1,[2,254]),o($VA1,[2,209]),o($VA1,[2,210]),o($VA1,[2,214]),o($VA1,[2,211]),o($VA1,[2,213]),o($VA1,[2,215]),o($VA1,[2,212]),{104:[1,398]},{104:[2,234],117:$V71,163:$V81,190:399,191:$VR1,192:$VS1,202:145,203:$VT,205:$VU,208:146,210:$VW,211:109,227:$V91,228:$Va1,231:$Vb1,232:$Vc1,235:$Vd1,236:$Ve1,237:$Vf1},{104:[2,235]},{13:400,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},o($Vm2,[2,264]),o($Vm2,[2,265]),{22:[1,401],117:$V71,163:$V81,202:145,203:$VT,205:$VU,208:146,210:$VW,211:109,227:$V91,228:$Va1,231:$Vb1,232:$Vc1,235:$Vd1,236:$Ve1,237:$Vf1},{22:[1,402],117:$V71,163:$V81,202:145,203:$VT,205:$VU,208:146,210:$VW,211:109,227:$V91,228:$Va1,231:$Vb1,232:$Vc1,235:$Vd1,236:$Ve1,237:$Vf1},o($VT1,[2,127],{211:109,202:145,208:146,117:$V71,163:$V81,228:$Va1,231:$Vb1,232:$Vc1,235:$Vd1,236:$Ve1,237:$Vf1}),{13:403,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},o($VT1,[2,354],{211:109,202:145,208:146,117:$V71,163:$V81,228:$Va1,231:$Vb1,232:$Vc1,235:$Vd1,236:$Ve1,237:$Vf1}),{13:404,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},{13:405,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},o($Vn2,[2,333]),{5:406,10:$V1,117:$V71,163:$V81,202:145,203:$VT,205:$VU,208:146,210:$VW,211:109,227:$V91,228:$Va1,231:$Vb1,232:$Vc1,235:$Vd1,236:$Ve1,237:$Vf1},o($Vh1,[2,284],{197:407,198:$VU1}),o($Vh1,[2,285]),{200:[1,408]},{5:409,10:$V1},{220:410,222:332,223:$VV1},{11:[1,411],221:[1,412],222:413,223:$VV1},o($Vo2,[2,326]),{13:415,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,194:414,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},o($Vh1,[2,247]),o($Vh1,[2,253]),{6:$V22,14:[1,417],99:[1,416],106:418},{51:[1,420],62:[1,419],82:[1,421]},{13:422,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},{51:[1,423],82:[1,424]},o($Vx1,[2,101]),o($VX1,[2,104]),o($VX1,[2,107],{108:[1,425]}),{83:[1,426],117:$V71,163:$V81,202:145,203:$VT,205:$VU,208:146,210:$VW,211:109,227:$V91,228:$Va1,231:$Vb1,232:$Vc1,235:$Vd1,236:$Ve1,237:$Vf1},o($Vh1,[2,148]),{82:$Vt1,142:427},{83:[1,428],117:$V71,163:$V81,202:145,203:$VT,205:$VU,208:146,210:$VW,211:109,227:$V91,228:$Va1,231:$Vb1,232:$Vc1,235:$Vd1,236:$Ve1,237:$Vf1},o($Vr1,[2,258]),o([6,10,22],$V22,{106:429,14:$V32}),o($V42,$V02,{211:109,202:145,208:146,117:$V71,163:$V81,203:$VT,205:$VU,210:$VW,227:$V91,228:$Va1,231:$Vb1,232:$Vc1,235:$Vd1,236:$Ve1,237:$Vf1}),{29:430,32:$Vz1},{31:431,33:212,50:214,51:$V8,57:213,58:$Vc},{31:432,33:212,50:214,51:$V8,57:213,58:$Vc},o($Vr1,[2,290]),{6:$V31,9:129,11:[1,433]},{13:434,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},{6:$V31,9:436,10:$Vp2,90:[1,435]},o([6,10,11,22,90],$Vq2,{34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,17:30,18:31,25:36,123:38,170:39,65:40,177:41,178:42,158:44,121:45,94:46,180:47,132:48,133:49,134:50,168:57,224:58,202:60,206:61,208:62,183:64,112:70,140:72,160:76,142:77,63:79,75:92,147:93,57:97,52:98,55:99,59:100,102:101,165:102,50:103,211:109,61:116,16:151,12:222,15:224,13:349,193:438,19:$V2,20:$V3,23:$V4,24:$V5,26:$V6,32:$V7,51:$V8,53:$V9,54:$Va,56:$Vb,58:$Vc,60:$Vd,62:$Ve,64:$Vf,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,76:$Vo,82:$Vp,84:$Vq,89:$Vr,96:$Vs,113:$Vt,114:$Vu,115:$Vv,122:$Vw,128:$Vx,130:$Vy,131:$Vz,135:$VA,136:$VB,143:$VC,144:$VD,146:$VE,148:$VF,149:$VG,150:$VH,162:$VI,163:$VD1,167:$VJ,175:$VK,176:$VL,179:$VM,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,203:$VT,205:$VU,207:$VV,210:$VW,219:$VX,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21}),o($Vr2,$V22,{106:439,14:$V32}),{13:440,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},{13:441,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},{90:[1,442],91:[1,443]},{14:$Vs2,139:[1,444]},o($Vt2,[2,181]),o($Vt2,[2,183]),o($Vt2,[2,184]),o($Vt2,[2,185],{108:[1,446]}),{50:370,51:$V8,161:447},{50:370,51:$V8,161:448},{50:370,51:$V8,161:449},o([14,22,108,139],[2,190]),{14:$Vs2,139:[1,450]},{6:$V31,9:452,10:$Vu2,83:[1,451]},o([6,10,11,83],$Vq2,{61:116,126:244,15:245,50:246,57:247,63:248,52:249,55:250,125:454,32:$V7,51:$V8,53:$V9,54:$Va,56:$Vb,58:$Vc,62:$Ve,64:$Vf,128:$VG1,130:$Vy,131:$Vz}),{10:[1,456],13:455,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},{117:$V71,129:[1,457],163:$V81,202:145,203:$VT,205:$VU,208:146,210:$VW,211:109,227:$V91,228:$Va1,231:$Vb1,232:$Vc1,235:$Vd1,236:$Ve1,237:$Vf1},o($Vn2,[2,330]),{13:458,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},{13:459,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},o($Vf2,[2,309]),{50:262,51:$V8,82:$Vt1,89:$VO1,142:264,160:263,215:460},o([1,6,10,11,14,22,83,90,99,104,127,129,139,191,192,203,205,210,227],[2,315],{211:109,202:145,208:146,117:$V71,163:$V81,204:[1,461],218:[1,462],228:$Va1,231:$Vb1,232:$Vc1,235:$Vd1,236:$Ve1,237:$Vf1}),o($Vv2,[2,316],{211:109,202:145,208:146,117:$V71,163:$V81,204:[1,463],228:$Va1,231:$Vb1,232:$Vc1,235:$Vd1,236:$Ve1,237:$Vf1}),o($Vh1,[2,249]),{13:464,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},o($Vh1,[2,118]),{116:465,119:$VI1,120:$VJ1},{50:277,51:$V8,57:278,58:$Vc,82:$VM1,153:466},o($Vw2,[2,167]),o($Vw2,[2,168]),o($Vx2,$V62,{159:363,142:364,160:365,161:366,50:370,138:467,51:$V8,82:$Vt1,89:$VO1,162:$V72,163:$V82,164:$V92}),{5:469,10:$V1,82:$Vk1,133:470,136:$VB,155:468},{5:469,10:$V1,82:$Vk1,133:470,136:$VB,155:471},{83:[1,472],117:$V71,163:$V81,202:145,203:$VT,205:$VU,208:146,210:$VW,211:109,227:$V91,228:$Va1,231:$Vb1,232:$Vc1,235:$Vd1,236:$Ve1,237:$Vf1},o($VA1,[2,192]),o($VA1,[2,195]),o($VP1,[2,11]),{13:473,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},o($VA1,[2,216]),{13:474,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,104:[2,268],112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},{104:[2,269],117:$V71,163:$V81,202:145,203:$VT,205:$VU,208:146,210:$VW,211:109,227:$V91,228:$Va1,231:$Vb1,232:$Vc1,235:$Vd1,236:$Ve1,237:$Vf1},o($Vq1,[2,22]),o($Vq1,[2,24]),{6:$V31,9:476,11:$Vy2,117:$V71,124:475,163:$V81,202:145,203:$VT,205:$VU,208:146,210:$VW,211:109,227:$V91,228:$Va1,231:$Vb1,232:$Vc1,235:$Vd1,236:$Ve1,237:$Vf1},{6:$V31,9:476,11:$Vy2,117:$V71,124:478,163:$V81,202:145,203:$VT,205:$VU,208:146,210:$VW,211:109,227:$V91,228:$Va1,231:$Vb1,232:$Vc1,235:$Vd1,236:$Ve1,237:$Vf1},{5:479,10:$V1,117:$V71,163:$V81,202:145,203:$VT,205:$VU,208:146,210:$VW,211:109,227:$V91,228:$Va1,231:$Vb1,232:$Vc1,235:$Vd1,236:$Ve1,237:$Vf1},o($Vn2,[2,332]),o($Vh1,[2,286]),{5:480,10:$V1},o($Vh1,[2,287]),{11:[1,481],221:[1,482],222:413,223:$VV1},o($Vh1,[2,324]),{5:483,10:$V1},o($Vo2,[2,327]),{5:484,10:$V1,14:[1,485]},o($Vz2,[2,281],{211:109,202:145,208:146,117:$V71,163:$V81,203:$VT,205:$VU,210:$VW,227:$V91,228:$Va1,231:$Vb1,232:$Vc1,235:$Vd1,236:$Ve1,237:$Vf1}),o($VW1,[2,89],{100:486,10:[1,487],21:[1,488]}),{6:$Vq2,105:489,107:$VY1},{6:[1,490]},o($Vx1,[2,96]),o($Vx1,[2,98]),{13:491,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},{104:[1,492],117:$V71,163:$V81,202:145,203:$VT,205:$VU,208:146,210:$VW,211:109,227:$V91,228:$Va1,231:$Vb1,232:$Vc1,235:$Vd1,236:$Ve1,237:$Vf1},o($Vx1,[2,100]),{13:493,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},{13:495,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,109:494,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},{99:[1,496]},{22:[1,497]},o($VZ1,[2,154]),{6:$V31,9:436,10:$Vp2,22:[1,498]},o($Vq1,[2,27]),o($V_1,[2,32]),o($Vq1,[2,28]),{129:[1,499]},{90:[1,500],117:$V71,163:$V81,202:145,203:$VT,205:$VU,208:146,210:$VW,211:109,227:$V91,228:$Va1,231:$Vb1,232:$Vc1,235:$Vd1,236:$Ve1,237:$Vf1},o($V12,[2,263]),{12:222,13:349,15:224,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,130:$Vy,131:$Vz,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,162:$VI,163:$VD1,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,193:501,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},{10:$VB1,12:222,13:349,15:224,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,110:502,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,130:$Vy,131:$Vz,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,162:$VI,163:$VD1,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,193:220,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},o($V42,[2,271]),{6:$V31,9:504,10:$Vp2,11:$Vy2,124:503},{83:[1,505],117:$V71,163:$V81,202:145,203:$VT,205:$VU,208:146,210:$VW,211:109,227:$V91,228:$Va1,231:$Vb1,232:$Vc1,235:$Vd1,236:$Ve1,237:$Vf1},{83:[1,506],117:$V71,163:$V81,202:145,203:$VT,205:$VU,208:146,210:$VW,211:109,227:$V91,228:$Va1,231:$Vb1,232:$Vc1,235:$Vd1,236:$Ve1,237:$Vf1},o($VL1,[2,82]),{32:$V7,51:[1,508],61:116,62:$Ve,63:509,64:$Vf,82:[1,510],92:507},{5:511,10:$V1},{50:370,51:$V8,82:$Vt1,89:$VO1,142:364,159:512,160:365,161:366,162:$V72,163:$V82,164:$V92},{13:513,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},o($Vt2,[2,186]),o($Vt2,[2,187]),o($Vt2,[2,188]),{5:514,10:$V1},o([1,6,10,11,14,21,22,81,82,83,90,99,103,104,108,117,127,129,136,139,163,172,174,187,191,192,203,204,205,210,216,217,218,227,228,231,232,235,236,237],[2,236]),{15:245,32:$V7,50:246,51:$V8,52:249,53:$V9,54:$Va,55:250,56:$Vb,57:247,58:$Vc,61:116,62:$Ve,63:248,64:$Vf,125:515,126:244,128:$VG1,130:$Vy,131:$Vz},o([6,10,11,14],$VF1,{61:116,125:243,126:244,15:245,50:246,57:247,63:248,52:249,55:250,182:516,32:$V7,51:$V8,53:$V9,54:$Va,56:$Vb,58:$Vc,62:$Ve,64:$Vf,128:$VG1,130:$Vy,131:$Vz}),o($Vb2,[2,239]),o($Vb2,[2,130],{211:109,202:145,208:146,117:$V71,163:$V81,203:$VT,205:$VU,210:$VW,227:$V91,228:$Va1,231:$Vb1,232:$Vc1,235:$Vd1,236:$Ve1,237:$Vf1}),{13:517,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},o($Vc2,[2,138]),o($Ve2,[2,293],{211:109,202:145,208:146,117:$V71,163:$V81,203:$VT,205:$VU,210:$VW,228:$Va1,231:$Vb1,232:$Vc1,235:$Vd1,236:$Ve1,237:$Vf1}),o($Ve2,[2,295],{211:109,202:145,208:146,117:$V71,163:$V81,203:$VT,205:$VU,210:$VW,228:$Va1,231:$Vb1,232:$Vc1,235:$Vd1,236:$Ve1,237:$Vf1}),o($Vf2,[2,314]),{13:518,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},{13:519,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},{13:520,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},o([1,6,11,14,22,83,90,99,104,127,129,139,191,192,204,218,227],[2,250],{211:109,202:145,208:146,5:521,10:$V1,117:$V71,163:$V81,203:$VT,205:$VU,210:$VW,228:$Va1,231:$Vb1,232:$Vc1,235:$Vd1,236:$Ve1,237:$Vf1}),o($VW1,[2,119],{5:522,10:$V1}),{21:[1,523],154:[1,524],156:[1,525]},{14:$Vs2,22:[1,526]},o($Vh1,[2,162]),o($Vh1,[2,172]),o($Vh1,[2,173]),o($Vh1,[2,166]),o($Vj2,[2,171]),o([1,6,10,11,14,22,83,90,99,104,127,129,139,191,192,203,204,205,210,218,227,228],[2,337],{211:109,202:145,208:146,117:$V71,163:$V81,231:$Vb1,232:$Vc1,235:$Vd1,236:$Ve1,237:$Vf1}),{104:[2,267],117:$V71,163:$V81,202:145,203:$VT,205:$VU,208:146,210:$VW,211:109,227:$V91,228:$Va1,231:$Vb1,232:$Vc1,235:$Vd1,236:$Ve1,237:$Vf1},o($Vh1,[2,128]),{11:$VA2},o($Vh1,[2,276]),o($Vh1,[2,355]),o($Vn2,[2,331]),o([1,6,10,11,14,22,83,90,99,104,117,127,129,139,163,191,192,198,203,204,205,210,218,227,228,231,232,235,236,237],[2,288]),o($Vh1,[2,322]),{5:528,10:$V1},{11:[1,529]},o($Vo2,[2,328],{6:[1,530]}),{13:531,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},o($Vh1,[2,90]),{10:$VB1,12:222,13:349,15:224,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,110:532,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,130:$Vy,131:$Vz,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,162:$VI,163:$VD1,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,193:220,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},{10:$VB1,12:222,13:349,15:224,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,110:533,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,130:$Vy,131:$Vz,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,162:$VI,163:$VD1,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,193:220,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},o($VX1,[2,105]),{105:534,107:$VY1},{83:[1,535],117:$V71,163:$V81,202:145,203:$VT,205:$VU,208:146,210:$VW,211:109,227:$V91,228:$Va1,231:$Vb1,232:$Vc1,235:$Vd1,236:$Ve1,237:$Vf1},o($Vx1,[2,97]),{83:[1,536],117:$V71,163:$V81,202:145,203:$VT,205:$VU,208:146,210:$VW,211:109,227:$V91,228:$Va1,231:$Vb1,232:$Vc1,235:$Vd1,236:$Ve1,237:$Vf1},o($VX1,[2,108]),o($VX1,[2,109],{211:109,202:145,208:146,117:$V71,163:$V81,203:$VT,205:$VU,210:$VW,227:$V91,228:$Va1,231:$Vb1,232:$Vc1,235:$Vd1,236:$Ve1,237:$Vf1}),o($Vh1,[2,91]),o($Vh1,[2,149]),o($Vr1,[2,259]),o($Vr1,[2,291]),o($Vr1,[2,266]),o($V42,[2,272]),o($Vr2,$V22,{106:537,14:$V32}),o($V42,[2,273]),{11:$VA2,12:222,13:349,15:224,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,130:$Vy,131:$Vz,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,162:$VI,163:$VD1,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,193:501,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},o($VL1,[2,76]),o($VL1,[2,77]),{90:[1,538]},{90:[2,86]},{90:[2,87]},{13:539,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},o($Vr1,[2,146]),o($Vt2,[2,182]),o($Vt2,[2,189],{211:109,202:145,208:146,117:$V71,163:$V81,203:$VT,205:$VU,210:$VW,227:$V91,228:$Va1,231:$Vb1,232:$Vc1,235:$Vd1,236:$Ve1,237:$Vf1}),{83:[1,540]},o($Vb2,[2,240]),o($Vr2,$V22,{106:541,14:$Va2}),{6:$V31,9:476,11:$Vy2,117:$V71,124:542,163:$V81,202:145,203:$VT,205:$VU,208:146,210:$VW,211:109,227:$V91,228:$Va1,231:$Vb1,232:$Vc1,235:$Vd1,236:$Ve1,237:$Vf1},o([1,6,10,11,14,22,83,90,99,104,127,129,139,191,192,203,204,205,210,227],[2,317],{211:109,202:145,208:146,117:$V71,163:$V81,218:[1,543],228:$Va1,231:$Vb1,232:$Vc1,235:$Vd1,236:$Ve1,237:$Vf1}),o($Vv2,[2,319],{211:109,202:145,208:146,117:$V71,163:$V81,204:[1,544],228:$Va1,231:$Vb1,232:$Vc1,235:$Vd1,236:$Ve1,237:$Vf1}),o($VT1,[2,318],{211:109,202:145,208:146,117:$V71,163:$V81,228:$Va1,231:$Vb1,232:$Vc1,235:$Vd1,236:$Ve1,237:$Vf1}),o($Vh1,[2,251]),o($Vh1,[2,120]),o($Vx2,$V62,{159:363,142:364,160:365,161:366,50:370,138:545,51:$V8,82:$Vt1,89:$VO1,162:$V72,163:$V82,164:$V92}),{5:469,10:$V1,82:$Vk1,133:470,136:$VB,155:546},{5:469,10:$V1,82:$Vk1,133:470,136:$VB,155:547},{154:[1,548],156:[1,549]},o($Vh1,[2,275]),{6:$V31,9:476,11:$Vy2,124:550},o($Vh1,[2,325]),o($Vo2,[2,329]),o($Vz2,[2,282],{211:109,202:145,208:146,117:$V71,163:$V81,203:$VT,205:$VU,210:$VW,227:$V91,228:$Va1,231:$Vb1,232:$Vc1,235:$Vd1,236:$Ve1,237:$Vf1}),o($VB2,$V22,{106:552,11:[1,551],14:$V32}),o($VB2,$V22,{106:552,14:$V32,22:[1,553]}),o($VX1,[2,106]),o($Vx1,[2,99]),o($Vx1,[2,102]),{6:$V31,9:504,10:$Vp2,11:$Vy2,124:554},o($VL1,[2,83]),{83:[1,555],117:$V71,163:$V81,202:145,203:$VT,205:$VU,208:146,210:$VW,211:109,227:$V91,228:$Va1,231:$Vb1,232:$Vc1,235:$Vd1,236:$Ve1,237:$Vf1},o($Vr1,[2,147]),{6:$V31,9:557,10:$Vu2,11:$Vy2,124:556},o($Vb2,[2,131]),{13:558,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},{13:559,16:151,17:30,18:31,19:$V2,20:$V3,23:$V4,24:$V5,25:36,26:$V6,32:$V7,34:12,35:13,36:14,37:15,38:16,39:17,40:18,41:19,42:20,43:21,44:22,45:23,46:24,47:25,48:26,49:27,50:103,51:$V8,52:98,53:$V9,54:$Va,55:99,56:$Vb,57:97,58:$Vc,59:100,60:$Vd,61:116,62:$Ve,63:79,64:$Vf,65:40,66:$Vg,67:$Vh,68:$Vi,69:$Vj,70:$Vk,71:$Vl,72:$Vm,73:$Vn,75:92,76:$Vo,82:$Vp,84:$Vq,89:$Vr,94:46,96:$Vs,102:101,112:70,113:$Vt,114:$Vu,115:$Vv,121:45,122:$Vw,123:38,128:$Vx,132:48,133:49,134:50,135:$VA,136:$VB,140:72,142:77,143:$VC,144:$VD,146:$VE,147:93,148:$VF,149:$VG,150:$VH,158:44,160:76,165:102,167:$VJ,168:57,170:39,175:$VK,176:$VL,177:41,178:42,179:$VM,180:47,183:64,184:$VN,185:$VO,188:$VP,189:$VQ,195:$VR,201:$VS,202:60,203:$VT,205:$VU,206:61,207:$VV,208:62,210:$VW,211:109,219:$VX,224:58,225:$VY,229:$VZ,230:$V_,231:$V$,232:$V01,233:$V11,234:$V21},{14:$Vs2,22:[1,560]},o($Vh1,[2,160]),o($Vh1,[2,164]),{5:469,10:$V1,82:$Vk1,133:470,136:$VB,155:561},{5:469,10:$V1,82:$Vk1,133:470,136:$VB,155:562},o($Vh1,[2,323]),o($Vh1,[2,110]),{6:$V31,9:436,10:$Vp2},o($Vh1,[2,111]),o($V42,[2,274]),{90:[2,88]},o($Vb2,[2,241]),{11:$VA2,15:245,32:$V7,50:246,51:$V8,52:249,53:$V9,54:$Va,55:250,56:$Vb,57:247,58:$Vc,61:116,62:$Ve,63:248,64:$Vf,125:515,126:244,128:$VG1,130:$Vy,131:$Vz},o($VT1,[2,320],{211:109,202:145,208:146,117:$V71,163:$V81,228:$Va1,231:$Vb1,232:$Vc1,235:$Vd1,236:$Ve1,237:$Vf1}),o($VT1,[2,321],{211:109,202:145,208:146,117:$V71,163:$V81,228:$Va1,231:$Vb1,232:$Vc1,235:$Vd1,236:$Ve1,237:$Vf1}),{154:[1,563],156:[1,564]},o($Vh1,[2,161]),o($Vh1,[2,165]),{5:469,10:$V1,82:$Vk1,133:470,136:$VB,155:565},{5:469,10:$V1,82:$Vk1,133:470,136:$VB,155:566},o($Vh1,[2,159]),o($Vh1,[2,163])],
defaultActions: {131:[2,3],158:[2,257],313:[2,235],508:[2,86],509:[2,87],555:[2,88]},
parseError: function parseError(str, hash) {
    if (hash.recoverable) {
        this.trace(str);
    } else {
        throw new Error(str);
    }
},
parse: function parse(input) {

    // For Imba we are going to drop most of the features that are not used
    // Locations are provided by the tokens from the lexer directly - so drop yylloc
    // We dont really need the shared state (it seems)

    var self = this,
        stack = [0],
        tstack = [], // token stack
        vstack = [null], // semantic value stack
        table = this.table,
        yytext = '',
        yylineno = 0,
        yyleng = 0,
        recovering = 0,
        TERROR = 2,
        EOF = 1;

    // var args = lstack.slice.call(arguments, 1);
    //this.reductionCount = this.shiftCount = 0;

    var lexer = Object.create(this.lexer);
    var yy = this.yy;

    lexer.setInput(input,yy);

    if (typeof yy.parseError === 'function') {
        this.parseError = yy.parseError;
    } else {
        this.parseError = Object.getPrototypeOf(this).parseError; // what?
    }

    function popStack (n) {
        stack.length = stack.length - 2 * n;
        vstack.length = vstack.length - n;
    }

    var symbol, preErrorSymbol, state, action, a, r, yyval = {}, p, len, newState, expected;

    function handleError(){
        var error_rule_depth;
        var errStr = '';

        // Return the rule stack depth where the nearest error rule can be found.
        // Return FALSE when no error recovery rule was found.
        // we have no rules now
        function locateNearestErrorRecoveryRule(state) {
            var stack_probe = stack.length - 1;
            var depth = 0;

            // try to recover from error
            for(;;) {
                // check for error recovery rule in this state
                if ((TERROR.toString()) in table[state]) {
                    return depth;
                }
                if (state === 0 || stack_probe < 2) {
                    return false; // No suitable error recovery rule available.
                }
                stack_probe -= 2; // popStack(1): [symbol, action]
                state = stack[stack_probe];
                ++depth;
            }
        }

        if (!recovering) {
            // first see if there's any chance at hitting an error recovery rule:
            error_rule_depth = locateNearestErrorRecoveryRule(state);

            // Report error
            expected = [];

            if (lexer.showPosition) {
                errStr = 'Parse error on line '+(yylineno+1)+":\n"+lexer.showPosition()+"\nExpecting "+expected.join(', ') + ", got '" + (self.terminals_[symbol] || symbol)+ "'";
            } else {
                errStr = 'Parse error on line '+(yylineno+1)+": Unexpected " + (symbol == EOF ? "end of input" : ("'"+(self.terminals_[symbol] || symbol)+"'"));
            }

            self.parseError(errStr, {
                lexer: lexer,
                text: lexer.match,
                token: self.terminals_[symbol] || symbol,
                line: lexer.yylineno,
                expected: expected,
                recoverable: (error_rule_depth !== false)
            });
        } else if (preErrorSymbol !== EOF) {
            error_rule_depth = locateNearestErrorRecoveryRule(state);
        }

        // just recovered from another error
        if (recovering == 3) {
            if (symbol === EOF || preErrorSymbol === EOF) {
                throw new Error(errStr || 'Parsing halted while starting to recover from another error.');
            }

            // discard current lookahead and grab another
            yyleng = lexer.yyleng;
            yytext = lexer.yytext;
            yylineno = lexer.yylineno;
            // symbol = lex();
        }

        // try to recover from error
        if (error_rule_depth === false) {
            throw new Error(errStr || 'Parsing halted. No suitable error recovery rule available.');
        }
        popStack(error_rule_depth);
        preErrorSymbol = (symbol == TERROR ? null : symbol); // save the lookahead token
        symbol = TERROR;         // insert generic error symbol as new lookahead
        state = stack[stack.length-1];
        action = table[state] && table[state][TERROR];
        recovering = 3; // allow 3 real symbols to be shifted before reporting a new error
    }


    var __sym = this.symbols_;
    var __prod = this.productions_;

    while (true) {
        // retreive state number from top of stack
        state = stack[stack.length - 1];

        if (symbol === null || typeof symbol == 'undefined') {
            symbol = __sym[lexer.lex()] || EOF;
        }
        action = table[state] && table[state][symbol];

_handle_error:
        if (typeof action === 'undefined' || !action.length || !action[0]) {
            handleError();
        }

        switch (action[0]) {
            case 1: // shift
                stack.push(symbol);
                stack.push(action[1]); // push state
                vstack.push(lexer.yytext);
                
                symbol = null;
                if (!preErrorSymbol) { // normal execution/no error
                    // yyleng = lexer.yyleng;
                    yytext = lexer.yytext;
                    yylineno = lexer.yylineno;
                    if (recovering > 0) {
                        recovering--;
                    }
                } else {
                    // error just occurred, resume old lookahead f/ before error
                    symbol = preErrorSymbol;
                    preErrorSymbol = null;
                }
                break;

            case 2:
                len = __prod[action[1]][1];

                // perform semantic action
                yyval.$ = vstack[vstack.length-len]; // default to $$ = $1

                r = this.performAction(yyval, yytext, yyleng, yylineno, yy, action[1], vstack);

                if (typeof r !== 'undefined') {
                    return r;
                }

                while(len > 0) {
                    stack.pop();
                    stack.pop();
                    vstack.pop();
                    len--;
                }

                stack.push(__prod[action[1]][0]);
                newState = table[stack[stack.length-2]][stack[stack.length-1]];
                stack.push(newState);
                vstack.push(yyval.$);
                break;

            case 3:
                // accept
                return true;
        }

    }

    return true;
}};

function Parser () {
  this.yy = {};
}
Parser.prototype = parser;parser.Parser = Parser;
return new Parser;
})();


if (typeof require !== 'undefined' && typeof exports !== 'undefined') {
exports.parser = parser;
exports.Parser = parser.Parser;
exports.parse = function () { return parser.parse.apply(parser, arguments); };
exports.main = function commonjsMain(args) {
    if (!args[1]) {
        console.log('Usage: '+args[0]+' FILE');
        process.exit(1);
    }
    var source = require('fs').readFileSync(require('path').normalize(args[1]), "utf8");
    return exports.parser.parse(source);
};
if (typeof module !== 'undefined' && require.main === module) {
  exports.main(process.argv.slice(1));
}
}
}).call(this,require('_process'))
},{"_process":13,"fs":11,"path":12}],9:[function(require,module,exports){
(function(){


	function idx$(a,b){
		return (b && b.indexOf) ? b.indexOf(a) : [].indexOf.call(a,b);
	};
	
	function iter$(a){ return a ? (a.toArray ? a.toArray() : a) : []; };
	var INVERSES;
	var T = require('./token');
	var Token = T.Token;
	
	// Based on the original rewriter.coffee from CoffeeScript
	/* @class Rewriter */
	function Rewriter(){ };
	
	exports.Rewriter = Rewriter; // export class 
	Rewriter.prototype.tokens = function (){
		return this._tokens;
	};
	
	// Helpful snippet for debugging:
	//     console.log (t[0] + '/' + t[1] for t in @tokens).join ' '
	// Rewrite the token stream in multiple passes, one logical filter at
	// a time. This could certainly be changed into a single pass through the
	// stream, with a big ol' efficient switch, but it's much nicer to work with
	// like this. The order of these passes matters -- indentation must be
	// corrected before implicit parentheses can be wrapped around blocks of code.
	Rewriter.prototype.rewrite = function (tokens,opts){
		if(opts === undefined) opts = {};
		this._tokens = tokens;
		this._options = opts;
		
		// console.log "tokens in: " + tokens:length
		if (opts.profile) { console.time("tokenize:rewrite") };
		
		this.step("ensureFirstLine");
		this.step("removeLeadingNewlines");
		this.step("removeMidExpressionNewlines");
		this.step("tagDefArguments");
		this.step("closeOpenCalls");
		this.step("closeOpenIndexes");
		this.step("closeOpenTags");
		this.step("closeOpenTagAttrLists");
		this.step("addImplicitIndentation");
		this.step("tagPostfixConditionals");
		this.step("addImplicitBraces");
		this.step("addImplicitParentheses");
		
		if (opts.profile) { console.timeEnd("tokenize:rewrite") };
		// console.log "tokens out: " + @tokens:length
		return this._tokens;
	};
	
	Rewriter.prototype.step = function (fn){
		if (this._options.profile) {
			console.log(("---- starting " + fn + " ---- "));
			console.time(fn);
		};
		
		this[fn]();
		
		if (this._options.profile) {
			console.timeEnd(fn);
			console.log("\n\n");
		};
		return;
	};
	
	// Rewrite the token stream, looking one token ahead and behind.
	// Allow the return value of the block to tell us how many tokens to move
	// forwards (or backwards) in the stream, to make sure we don't miss anything
	// as tokens are inserted and removed, and the stream changes length under
	// our feet.
	Rewriter.prototype.scanTokens = function (block){
		var token;
		var tokens = this._tokens;
		
		var i = 0;
		while (token = tokens[i]){
			i += block.call(this,token,i,tokens);
		};
		
		return true;
	};
	
	Rewriter.prototype.detectEnd = function (i,condition,action){
		var tokens = this._tokens;
		var levels = 0;
		var starts = [];
		var token;
		var t,v;
		
		while (token = tokens[i]){
			if (levels == 0 && condition.call(this,token,i,starts)) {
				return action.call(this,token,i);
			};
			if (!token || levels < 0) {
				return action.call(this,token,i - 1);
			};
			
			t = T.typ(token);
			
			if (EXPRESSION_START.indexOf(t) >= 0) {
				if (levels == 0) { starts.push(i) };
				levels += 1;
			} else if (EXPRESSION_END.indexOf(t) >= 0) {
				levels -= 1;
			};
			i += 1;
		};
		return i - 1;
	};
	
	Rewriter.prototype.ensureFirstLine = function (){
		var tok = this._tokens[0];
		
		if (T.typ(tok) == 'TERMINATOR') {
			// console.log "adding bodystart"
			this._tokens = [T.token('BODYSTART','BODYSTART')].concat(this._tokens);
			// T.setTyp(tok,'HEADER')
		};
		return;
	};
	
	// Leading newlines would introduce an ambiguity in the grammar, so we
	// dispatch them here.
	Rewriter.prototype.removeLeadingNewlines = function (){
		var at = 0;
		
		for (var i=0, ary=iter$(this._tokens), len=ary.length; i < len; i++) {
			if (T.typ(ary[i]) != 'TERMINATOR') {
				at = i;break;
			};
		};
		
		if (at) { this._tokens.splice(0,at) };
		
		return;
	};
	
	// Some blocks occur in the middle of expressions -- when we're expecting
	// this, remove their trailing newlines.
	Rewriter.prototype.removeMidExpressionNewlines = function (){
		var self=this;
		return self.scanTokens(function(token,i,tokens) { // do |token,i,tokens|
			var next = self.tokenType(i + 1);
			
			if (!(T.typ(token) == 'TERMINATOR' && EXPRESSION_CLOSE.indexOf(next) >= 0)) { return 1 };
			if (next == 'OUTDENT') { return 1 };
			tokens.splice(i,1);
			return 0;
		});
	};
	
	
	Rewriter.prototype.tagDefArguments = function (){
		return true;
	};
	
	// The lexer has tagged the opening parenthesis of a method call. Match it with
	// its paired close. We have the mis-nested outdent case included here for
	// calls that close on the same line, just before their outdent.
	Rewriter.prototype.closeOpenCalls = function (){
		var self=this;
		var condition = function(token,i) {
			var t = T.typ(token);
			return (t == ')' || t == 'CALL_END') || t == 'OUTDENT' && self.tokenType(i - 1) == ')';
		};
		
		var action = function(token,i) {
			var t = T.typ(token);
			var tok = self._tokens[t == 'OUTDENT' ? (i - 1) : (i)];
			return T.setTyp(tok,'CALL_END');
		};
		
		return self.scanTokens(function(token,i) {
			if (T.typ(token) == 'CALL_START') { self.detectEnd(i + 1,condition,action) };
			return 1;
		});
	};
	
	// The lexer has tagged the opening parenthesis of an indexing operation call.
	// Match it with its paired close.
	Rewriter.prototype.closeOpenIndexes = function (){
		var self=this;
		var condition = function(token,i) {
			return idx$(T.typ(token),[']','INDEX_END']) >= 0;
		};
		var action = function(token,i) {
			return T.setTyp(token,'INDEX_END');
		};
		
		return self.scanTokens(function(token,i) {
			if (T.typ(token) == 'INDEX_START') { self.detectEnd(i + 1,condition,action) };
			return 1;
		});
	};
	
	
	Rewriter.prototype.closeOpenTagAttrLists = function (){
		var self=this;
		var condition = function(token,i) {
			return idx$(T.typ(token),[')','TAG_ATTRS_END']) >= 0;
		};
		var action = function(token,i) {
			return T.setTyp(token,'TAG_ATTRS_END');
		}; // 'TAG_ATTRS_END'
		
		return self.scanTokens(function(token,i) {
			if (T.typ(token) == 'TAG_ATTRS_START') { self.detectEnd(i + 1,condition,action) };
			return 1;
		});
	};
	
	// The lexer has tagged the opening parenthesis of an indexing operation call.
	// Match it with its paired close. Should be done in lexer directly
	Rewriter.prototype.closeOpenTags = function (){
		var self=this;
		var condition = function(token,i) {
			return idx$(T.typ(token),['>','TAG_END']) >= 0;
		};
		var action = function(token,i) {
			return T.setTyp(token,'TAG_END');
		}; // token[0] = 'TAG_END'
		
		return self.scanTokens(function(token,i) {
			if (T.typ(token) == 'TAG_START') { self.detectEnd(i + 1,condition,action) };
			return 1;
		});
	};
	
	Rewriter.prototype.addImplicitCommas = function (){
		return;
	};
	
	Rewriter.prototype.addImplicitBlockCalls = function (){
		var token;
		var i = 1;
		var tokens = this._tokens;
		
		while (token = tokens[i]){
			var t = token._type;
			var v = token._value;
			// hmm
			if (t == 'DO' && (v == 'INDEX_END' || v == 'IDENTIFIER' || v == 'NEW')) {
				tokens.splice(i + 1,0,T.token('CALL_END',')'));
				tokens.splice(i + 1,0,T.token('CALL_START','('));
				i++;
			};
			i++;
		};
		
		return;
	};
	
	// Object literals may be written with implicit braces, for simple cases.
	// Insert the missing braces here, so that the parser doesn't have to.
	Rewriter.prototype.addImplicitBraces = function (){
		var self=this;
		var stack = [];
		var start = null;
		var startIndent = 0;
		var startIdx = null;
		
		var scope = function() {
			return stack[stack.length - 1] || [];
		};
		
		var action = function(token,i) {
			return self._tokens.splice(i,0,T.RBRACKET);
		};
		
		var open = function(token,i) {
			return self._tokens.splice(i,0,T.LBRACKET);
		};
		
		var close = function(token,i) {
			return self._tokens.splice(i,0,T.RBRACKET);
		};
		
		var stackToken = function(a,b) {
			return [a,b];
		};
		
		return self.scanTokens(function(token,i,tokens) {
			var type = T.typ(token);
			var v = T.val(token);
			var ctx = stack[stack.length - 1] || [];
			var idx;
			
			if (v == '?') {
				// console.log('TERNARY OPERATOR!')
				stack.push(stackToken('TERNARY',i));
				return 1;
			};
			
			// no need to test for this here as well as in
			if (EXPRESSION_START.indexOf(type) >= 0) {
				// console.log('expression start',type)
				if (type == 'INDENT' && self.tokenType(i - 1) == '{') {
					// stack ?!? no token
					stack.push(stackToken('{',i)); // should not autogenerate another?
				} else {
					stack.push(stackToken(type,i));
				};
				return 1;
			};
			
			if (EXPRESSION_END.indexOf(type) >= 0) {
				if (ctx[0] == 'TERNARY') { // FIX?
					stack.pop();
				};
				
				start = stack.pop();
				if (!start) {
					console.log("NO STACK!!");
				};
				start[2] = i;
				
				// seems like the stack should use tokens, no?)
				if (start[0] == '{' && start.generated) { //  # type != '}' # and start:generated
					close(token,i);
					return 1;
				};
				
				return 1;
			};
			
			
			if (ctx[0] == 'TERNARY' && (type == 'TERMINATOR' || type == 'OUTDENT')) {
				stack.pop();
				return 1;
			};
			
			
			if (type == ',') {
				// automatically add an ending here if inside:generated scope?
				// it is important that this is:generated(!)
				if (ctx[0] == '{' && ctx.generated) {
					tokens.splice(i,0,T.RBRACKET);
					stack.pop();
					return 2;
				} else {
					return 1;
				};
				true;
			};
			
			// found a type
			if (type == ':' && ctx[0] != '{' && ctx[0] != 'TERNARY') {
				// could just check if the end was right before this?
				
				if (start && start[2] == i - 1) {
					// console.log('this expression was just ending before colon!')
					idx = start[1] - 1; // these are the stackTokens
				} else {
					// console.log "rewrite here? #{i}"
					idx = i - 2; // if start then start[1] - 1 else i - 2
					// idx = idx - 1 if tokenType(idx) is 'TERMINATOR'
				};
				
				while (self.tokenType(idx - 1) == 'HERECOMMENT'){
					idx -= 2;
				};
				
				var t0 = tokens[idx - 1];
				
				if (t0 && T.typ(t0) == '}' && t0.generated) {
					tokens.splice(idx - 1,1);
					var s = stackToken('{');
					s.generated = true;
					stack.push(s);
					return 0;
				} else if (t0 && T.typ(t0) == ',' && self.tokenType(idx - 2) == '}') {
					tokens.splice(idx - 2,1);
					s = stackToken('{');
					s.generated = true;
					stack.push(s);
					return 0;
				} else {
					s = stackToken('{');
					s.generated = true;
					stack.push(s);
					open(token,idx + 1);
					return 2;
				};
			};
			
			// we probably need to run through autocall first?!
			
			if (type == 'DO') { // and ctx:generated
				var prev = T.typ(tokens[i - 1]); // [0]
				if (['NUMBER','STRING','REGEX','SYMBOL',']','}',')'].indexOf(prev) >= 0) {
					
					var tok = T.token(',',',');
					tok.generated = true;
					tokens.splice(i,0,tok);
					
					if (ctx.generated) {
						close(token,i);
						stack.pop();
						return 2;
					};
				};
			};
			
			if ((type == 'TERMINATOR' || type == 'OUTDENT' || type == 'DEF_BODY') && ctx.generated) {
				close(token,i);
				stack.pop();
				return 2;
			};
			
			return 1;
		});
	};
	
	// Methods may be optionally called without parentheses, for simple cases.
	// Insert the implicit parentheses here, so that the parser doesn't have to
	// deal with them.
	// Practically everything will now be callable this way (every identifier)
	Rewriter.prototype.addImplicitParentheses = function (){
		var self=this, token;
		var noCall = false;
		var noCallTag = ['CLASS','IF','UNLESS','TAG','WHILE','FOR','UNTIL','CATCH','FINALLY','MODULE','LEADING_WHEN'];
		
		var action = function(token,i) {
			return self._tokens.splice(i,0,T.token('CALL_END',')'));
		};
		
		// console.log "adding implicit parenthesis" # ,self:scanTokens
		var tokens = self._tokens;
		
		
		var endCallAtTerminator = false;
		
		var i = 0;
		while (token = tokens[i]){
			// console.log "detect end??"
			var type = token._type;
			
			// Never make these tags implicitly call
			if (noCallTag.indexOf(type) >= 0) {
				// console.log("is nocall {type}")
				endCallAtTerminator = true;
				noCall = true;
			};
			
			var prev = tokens[i - 1];
			var current = tokens[i];
			var next = tokens[i + 1];
			
			var pt = prev && prev._type;
			var nt = next && next._type;
			
			var callObject = false;
			var callIndent = false;
			
			// [prev, current, next] = tokens[i - 1 .. i + 1]
			
			// check for comments
			// console.log "detect end??"
			if (!noCall && type == 'INDENT' && next) {
				var prevImpFunc = pt && IMPLICIT_FUNC.indexOf(pt) >= 0;
				var nextImpCall = nt && IMPLICIT_CALL.indexOf(nt) >= 0;
				callObject = ((next.generated && nt == '{') || nextImpCall) && prevImpFunc;
				callIndent = nextImpCall && prevImpFunc;
			};
			
			var seenSingle = false;
			var seenControl = false;
			// Hmm ?
			
			// this is not correct if this is inside a block,no?
			if ((type == 'TERMINATOR' || type == 'OUTDENT' || type == 'INDENT')) {
				endCallAtTerminator = false;
				noCall = false;
			};
			
			if (type == '?' && prev && !(prev.spaced)) { token.call = true };
			
			// where does fromThem come from?
			if (token.fromThen) {
				i += 1;continue;
			};
			// here we deal with :spaced and :newLine
			if (!(callObject || callIndent || (prev && prev.spaced) && (prev.call || IMPLICIT_FUNC.indexOf(pt) >= 0) && (IMPLICIT_CALL.indexOf(type) >= 0 || !(token.spaced || token.newLine) && IMPLICIT_UNSPACED_CALL.indexOf(type) >= 0))) {
				i += 1;continue;
			};
			
			
			tokens.splice(i,0,T.token('CALL_START','('));
			
			var cond = function(token,i) {
				var type = T.typ(token);
				if (!seenSingle && token.fromThen) { return true };
				var ifelse = type == 'IF' || type == 'UNLESS' || type == 'ELSE';
				if (ifelse || type == 'CATCH') { seenSingle = true };
				if (ifelse || type == 'SWITCH' || type == 'TRY') { seenControl = true };
				var prev = self.tokenType(i - 1);
				
				if ((type == '.' || type == '?.' || type == '::') && prev == 'OUTDENT') { return true };
				if (endCallAtTerminator && (type == 'INDENT' || type == 'TERMINATOR')) { return true };
				
				var post = tokens[i + 1];
				var postTyp = post && T.typ(post);
				// WTF
				return !(token.generated) && prev != ',' && (IMPLICIT_END.indexOf(type) >= 0 || (type == 'INDENT' && !seenControl) || (type == 'DOS' && prev != '=')) && (type != 'INDENT' || (self.tokenType(i - 2) != 'CLASS' && IMPLICIT_BLOCK.indexOf(prev) == -1 && !(post && ((post.generated && postTyp == '{') || IMPLICIT_CALL.indexOf(postTyp) >= 0))));
			};
			
			// The action for detecting when the call should end
			// console.log "detect end??"
			self.detectEnd(i + 1,cond,action);
			if (T.typ(prev) == '?') { T.setTyp(prev,'FUNC_EXIST') };
			i += 2;
		};
		
		return;
	};
	
	// Because our grammar is LALR(1), it can't handle some single-line
	// expressions that lack ending delimiters. The **Rewriter** adds the implicit
	// blocks, so it doesn't need to. ')' can close a single-line block,
	// but we need to make sure it's balanced.
	Rewriter.prototype.addImplicitIndentation = function (){
		
		
		var self=this, token;
		var i = 0;
		var tokens = self._tokens;
		while (token = tokens[i]){
			var type = T.typ(token);
			var next = self.tokenType(i + 1);
			
			// why are we removing terminators after then? should be able to handle
			if (type == 'TERMINATOR' && next == 'THEN') {
				tokens.splice(i,1);
				continue;
			};
			
			if (type == 'CATCH' && idx$(self.tokenType(i + 2),['OUTDENT','TERMINATOR','FINALLY']) >= 0) {
				tokens.splice.apply(tokens,[].concat([i + 2,0], [].slice.call(self.indentation(token))));
				i += 4;continue;
			};
			
			if (SINGLE_LINERS.indexOf(type) >= 0 && (next != 'INDENT' && next != 'BLOCK_PARAM_START') && !(type == 'ELSE' && next == 'IF') && type != 'ELIF') {
				
				var starter = type;
				
				var indent = T.token('INDENT','2');
				var outdent = T.OUTDENT;
				// var indent, outdent = indentation(token)
				if (starter == 'THEN') { indent.fromThen = true }; // setting special values for these -- cannot really reuse?
				indent.generated = true;
				// outdent:generated = true
				tokens.splice(i + 1,0,indent);
				
				var condition = function(token,i) {
					var t = T.typ(token);
					return T.val(token) != ';' && SINGLE_CLOSERS.indexOf(t) >= 0 && !(t == 'ELSE' && starter != 'IF' && starter != 'THEN');
				};
				
				var action = function(token,i) {
					var idx = self.tokenType(i - 1) == ',' ? (i - 1) : (i);
					return tokens.splice(idx,0,outdent);
				};
				
				self.detectEnd(i + 2,condition,action);
				if (type == 'THEN') { tokens.splice(i,1) };
			};
			
			i++;
		};
		
		return;
	};
	
	// Tag postfix conditionals as such, so that we can parse them with a
	// different precedence.
	Rewriter.prototype.tagPostfixConditionals = function (){
		var self=this;
		var condition = function(token,i) {
			return idx$(T.typ(token),['TERMINATOR','INDENT']) >= 0;
		};
		
		return self.scanTokens(function(token,i) {
			if (T.typ(token) != 'IF') { return 1 };
			var original = token;
			self.detectEnd(i + 1,condition,function(token,i) {
				if (T.typ(token) != 'INDENT') { return T.setTyp(original,'POST_' + T.typ(original)) };
			});
			return 1;
		});
	};
	
	// Generate the indentation tokens, based on another token on the same line.
	Rewriter.prototype.indentation = function (token){
		return [T.token('INDENT','2'),T.token('OUTDENT','2')];
	};
	
	// Look up a type by token index.
	Rewriter.prototype.type = function (i){
		// if i < 0 then return null
		var tok = this._tokens[i];
		return tok && T.typ(tok);
		// if tok then tok[0] else null
	};
	
	Rewriter.prototype.tokenType = function (i){
		var tok = this._tokens[i];
		return tok && T.typ(tok);
		// return tok and tok[0]
	};
	
	
	// Constants
	// ---------
	
	// List of the token pairs that must be balanced.
	var BALANCED_PAIRS = [
		['(',')'],
		['[',']'],
		['{','}'],
		['INDENT','OUTDENT'],
		['CALL_START','CALL_END'],
		['PARAM_START','PARAM_END'],
		['INDEX_START','INDEX_END'],
		['TAG_START','TAG_END'],
		['TAG_PARAM_START','TAG_PARAM_END'],
		['TAG_ATTRS_START','TAG_ATTRS_END'],
		['BLOCK_PARAM_START','BLOCK_PARAM_END']
	];
	
	// The inverse mappings of `BALANCED_PAIRS` we're trying to fix up, so we can
	// look things up from either end.
	module.exports.INVERSES = INVERSES = {};
	
	// The tokens that signal the start/end of a balanced pair.
	// var EXPRESSION_START = []
	// var EXPRESSION_END   = []
	
	for (var i=0, ary=iter$(BALANCED_PAIRS), len=ary.length, pair; i < len; i++) {
		pair = ary[i];var left = pair[0];
		var rite = pair[1];
		INVERSES[rite] = left;
		INVERSES[left] = rite;
	};
	
	var EXPRESSION_START = ['(','[','{','INDENT','CALL_START','PARAM_START','INDEX_START','TAG_PARAM_START','BLOCK_PARAM_START'];
	var EXPRESSION_END = [')',']','}','OUTDENT','CALL_END','PARAM_END','INDEX_END','TAG_PARAM_END','BLOCK_PARAM_END'];
	
	var IDENTIFIERS = ['IDENTIFIER','GVAR','IVAR','CVAR','CONST','ARGVAR'];
	
	// Tokens that indicate the close of a clause of an expression.
	var EXPRESSION_CLOSE = ['CATCH','WHEN','ELSE','FINALLY'].concat(EXPRESSION_END);
	
	// Tokens that, if followed by an `IMPLICIT_CALL`, indicate a function invocation.
	var IMPLICIT_FUNC = ['IDENTIFIER','SUPER',')',']','INDEX_END','@','THIS','SELF','EVENT','TRIGGER','TAG_END','IVAR',
	'GVAR','CONST','ARGVAR','NEW','BREAK','CONTINUE','RETURN'];
	
	// If preceded by an `IMPLICIT_FUNC`, indicates a function invocation.
	var IMPLICIT_CALL = [
		'SELECTOR','IDENTIFIER','NUMBER','STRING','SYMBOL','JS','REGEX','NEW','PARAM_START','CLASS',
		'IF','UNLESS','TRY','SWITCH','THIS','BOOL','TRUE','FALSE','NULL','UNDEFINED','UNARY','SUPER','IVAR','GVAR','CONST','ARGVAR','SELF',
		'NEW','@','[','(','{','--','++','SELECTOR','TAG_START','TAGID','#','SELECTOR_START','IDREF','SPLAT','DO','BLOCK_ARG'
	]; // '->', '=>', why does it not work with symbol?
	// is not do an implicit call??
	
	var IMPLICIT_UNSPACED_CALL = ['+','-'];
	
	// Tokens indicating that the implicit call must enclose a block of expressions.
	var IMPLICIT_BLOCK = ['{','[',',','BLOCK_PARAM_END','DO']; // '->', '=>', 
	
	var CONDITIONAL_ASSIGN = ['||=','&&=','?=','&=','|='];
	var COMPOUND_ASSIGN = ['-=','+=','/=','*=','%=','||=','&&=','?=','<<=','>>=','>>>=','&=','^=','|='];
	var UNARY = ['!','~','NEW','TYPEOF','DELETE'];
	var LOGIC = ['&&','||','&','|','^'];
	
	// optimize for fixed arrays
	var NO_IMPLICIT_BLOCK_CALL = [
		'CALL_END','=','DEF_BODY','(','CALL_START',',',':','RETURN',
		'-=','+=','/=','*=','%=','||=','&&=','?=','<<=','>>=','>>>=','&=','^=','|='
	]; // .concat(COMPOUND_ASSIGN)
	
	
	// console.log NO_IMPLICIT_BLOCK_CALL:length
	// NO_IMPLICIT_BLOCK_CALL
	// IMPLICIT_COMMA = ['->', '=>', '{', '[', 'NUMBER', 'STRING', 'SYMBOL', 'IDENTIFIER','DO']
	
	var IMPLICIT_COMMA = ['DO'];
	
	// Tokens that always mark the end of an implicit call for single-liners.
	var IMPLICIT_END = ['POST_IF','POST_UNLESS','FOR','WHILE','UNTIL','WHEN','BY','LOOP','TERMINATOR','DEF_BODY','DEF_FRAGMENT'];
	
	// Single-line flavors of block expressions that have unclosed endings.
	// The grammar can't disambiguate them, so we insert the implicit indentation.
	var SINGLE_LINERS = ['ELSE','TRY','FINALLY','THEN','BLOCK_PARAM_END','DO','BEGIN','CATCH_VAR']; // '->', '=>', really?
	var SINGLE_CLOSERS = ['TERMINATOR','CATCH','FINALLY','ELSE','OUTDENT','LEADING_WHEN'];
	
	// Tokens that end a line.
	var LINEBREAKS = ['TERMINATOR','INDENT','OUTDENT'];


}())
},{"./token":10}],10:[function(require,module,exports){
(function(){


	var TOK, LBRACKET, RBRACKET, LPAREN, RPAREN, INDENT, OUTDENT;
	module.exports.TOK = TOK = {};
	var TTERMINATOR = TOK.TERMINATOR = 1;
	var TIDENTIFIER = TOK.IDENTIFIER = 2;
	TIDENTIFIER = TOK.IVAR = 2;
	var CONST = TOK.CONST = 3;
	var VAR = TOK.VAR = 4;
	var IF = TOK.IF = 5;
	var ELSE = TOK.ELSE = 6;
	var DEF = TOK.DEF = 7;
	
	
	
	/* @class Token */
	function Token(type,value,line,loc,len){
		this._type = type;
		this._value = value;
		this._meta = null;
		this._line = line || 0;
		this._col = -1;
		this._loc = loc || 0;
		this._len = len || 0;
		this.generated = false;
		this.newLine = false;
		this.spaced = false;
		return this;
	};
	
	exports.Token = Token; // export class 
	
	
	Token.prototype.type = function (){
		return this._type;
	};
	
	Token.prototype.value = function (){
		return this._value;
	};
	
	Token.prototype.traverse = function (){
		return;
	};
	
	Token.prototype.c = function (){
		return "" + this._value;
	};
	
	Token.prototype.toString = function (){
		return this._value;
	};
	
	Token.prototype.charAt = function (i){
		return this._value.charAt(i);
	};
	
	Token.prototype.slice = function (i){
		return this._value.slice(i);
	};
	
	Token.prototype.region = function (){
		return [this._loc,this._loc + (this._len || this._value.length)];
	};
	
	
	
	function lex(){
		var line;
		var token = this.tokens[this.pos++];
		var ttag;
		
		if (token) {
			ttag = token._type;
			this.yytext = token;
			
			if (line = token._line) {
				this.yylineno = line;
			};
		} else {
			ttag = '';
		};
		
		return ttag;
	}; exports.lex = lex;
	
	
	// export def token typ, val, line, col, len do Token.new(typ,val,line, col or 0, len or 0) # [null,typ,val,loc]
	function token(typ,val){
		return new Token(typ,val,0,0,0);
	}; exports.token = token;
	
	function typ(tok){
		return tok._type;
	}; exports.typ = typ;
	function val(tok){
		return tok._value;
	}; exports.val = val; // tok[offset + 1]
	function line(tok){
		return tok._line;
	}; exports.line = line; // tok[offset + 2]
	function loc(tok){
		return tok._loc;
	}; exports.loc = loc; // tok[offset + 2]
	
	function setTyp(tok,v){
		return tok._type = v;
	}; exports.setTyp = setTyp;
	function setVal(tok,v){
		return tok._value = v;
	}; exports.setVal = setVal;
	function setLine(tok,v){
		return tok._line = v;
	}; exports.setLine = setLine;
	function setLoc(tok,v){
		return tok._loc = v;
	}; exports.setLoc = setLoc;
	
	
	module.exports.LBRACKET = LBRACKET = new Token('{','{',0,0,0);
	module.exports.RBRACKET = RBRACKET = new Token('}','}',0,0,0);
	
	module.exports.LPAREN = LPAREN = new Token('(','(',0,0,0);
	module.exports.RPAREN = RPAREN = new Token(')',')',0,0,0);
	
	LBRACKET.generated = true;
	RBRACKET.generated = true;
	LPAREN.generated = true;
	RPAREN.generated = true;
	
	module.exports.INDENT = INDENT = new Token('INDENT','2',0,0,0);
	module.exports.OUTDENT = OUTDENT = new Token('OUTDENT','2',0,0,0);


}())
},{}],11:[function(require,module,exports){

},{}],12:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require('_process'))
},{"_process":13}],13:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;

function drainQueue() {
    if (draining) {
        return;
    }
    draining = true;
    var currentQueue;
    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        var i = -1;
        while (++i < len) {
            currentQueue[i]();
        }
        len = queue.length;
    }
    draining = false;
}
process.nextTick = function (fun) {
    queue.push(fun);
    if (!draining) {
        setTimeout(drainQueue, 0);
    }
};

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],14:[function(require,module,exports){
/*
Syntax highlighting with language autodetection.
https://highlightjs.org/
*/

(function(factory) {

  // Setup highlight.js for different environments. First is Node.js or
  // CommonJS.
  if(typeof exports !== 'undefined') {
    factory(exports);
  } else {
    // Export hljs globally even when using AMD for cases when this script
    // is loaded with others that may still expect a global hljs.
    window.hljs = factory({});

    // Finally register the global hljs with AMD.
    if(typeof define === 'function' && define.amd) {
      define('hljs', [], function() {
        return window.hljs;
      });
    }
  }

}(function(hljs) {

  /* Utility functions */

  function escape(value) {
    return value.replace(/&/gm, '&amp;').replace(/</gm, '&lt;').replace(/>/gm, '&gt;');
  }

  function tag(node) {
    return node.nodeName.toLowerCase();
  }

  function testRe(re, lexeme) {
    var match = re && re.exec(lexeme);
    return match && match.index == 0;
  }

  function isNotHighlighted(language) {
    return /no-?highlight|plain|text/.test(language);
  }

  function blockLanguage(block) {
    var i, match, length,
        classes = block.className + ' ';

    classes += block.parentNode ? block.parentNode.className : '';

    // language-* takes precedence over non-prefixed class names and
    match = /\blang(?:uage)?-([\w-]+)\b/.exec(classes);
    if (match) {
      return getLanguage(match[1]) ? match[1] : 'no-highlight';
    }

    classes = classes.split(/\s+/);
    for(i = 0, length = classes.length; i < length; i++) {
      if(getLanguage(classes[i]) || isNotHighlighted(classes[i])) {
        return classes[i];
      }
    }

  }

  function inherit(parent, obj) {
    var result = {}, key;
    for (key in parent)
      result[key] = parent[key];
    if (obj)
      for (key in obj)
        result[key] = obj[key];
    return result;
  }

  /* Stream merging */

  function nodeStream(node) {
    var result = [];
    (function _nodeStream(node, offset) {
      for (var child = node.firstChild; child; child = child.nextSibling) {
        if (child.nodeType == 3)
          offset += child.nodeValue.length;
        else if (child.nodeType == 1) {
          result.push({
            event: 'start',
            offset: offset,
            node: child
          });
          offset = _nodeStream(child, offset);
          // Prevent void elements from having an end tag that would actually
          // double them in the output. There are more void elements in HTML
          // but we list only those realistically expected in code display.
          if (!tag(child).match(/br|hr|img|input/)) {
            result.push({
              event: 'stop',
              offset: offset,
              node: child
            });
          }
        }
      }
      return offset;
    })(node, 0);
    return result;
  }

  function mergeStreams(original, highlighted, value) {
    var processed = 0;
    var result = '';
    var nodeStack = [];

    function selectStream() {
      if (!original.length || !highlighted.length) {
        return original.length ? original : highlighted;
      }
      if (original[0].offset != highlighted[0].offset) {
        return (original[0].offset < highlighted[0].offset) ? original : highlighted;
      }

      /*
      To avoid starting the stream just before it should stop the order is
      ensured that original always starts first and closes last:

      if (event1 == 'start' && event2 == 'start')
        return original;
      if (event1 == 'start' && event2 == 'stop')
        return highlighted;
      if (event1 == 'stop' && event2 == 'start')
        return original;
      if (event1 == 'stop' && event2 == 'stop')
        return highlighted;

      ... which is collapsed to:
      */
      return highlighted[0].event == 'start' ? original : highlighted;
    }

    function open(node) {
      function attr_str(a) {return ' ' + a.nodeName + '="' + escape(a.value) + '"';}
      result += '<' + tag(node) + Array.prototype.map.call(node.attributes, attr_str).join('') + '>';
    }

    function close(node) {
      result += '</' + tag(node) + '>';
    }

    function render(event) {
      (event.event == 'start' ? open : close)(event.node);
    }

    while (original.length || highlighted.length) {
      var stream = selectStream();
      result += escape(value.substr(processed, stream[0].offset - processed));
      processed = stream[0].offset;
      if (stream == original) {
        /*
        On any opening or closing tag of the original markup we first close
        the entire highlighted node stack, then render the original tag along
        with all the following original tags at the same offset and then
        reopen all the tags on the highlighted stack.
        */
        nodeStack.reverse().forEach(close);
        do {
          render(stream.splice(0, 1)[0]);
          stream = selectStream();
        } while (stream == original && stream.length && stream[0].offset == processed);
        nodeStack.reverse().forEach(open);
      } else {
        if (stream[0].event == 'start') {
          nodeStack.push(stream[0].node);
        } else {
          nodeStack.pop();
        }
        render(stream.splice(0, 1)[0]);
      }
    }
    return result + escape(value.substr(processed));
  }

  /* Initialization */

  function compileLanguage(language) {

    function reStr(re) {
        return (re && re.source) || re;
    }

    function langRe(value, global) {
      return new RegExp(
        reStr(value),
        'm' + (language.case_insensitive ? 'i' : '') + (global ? 'g' : '')
      );
    }

    function compileMode(mode, parent) {
      if (mode.compiled)
        return;
      mode.compiled = true;

      mode.keywords = mode.keywords || mode.beginKeywords;
      if (mode.keywords) {
        var compiled_keywords = {};

        var flatten = function(className, str) {
          if (language.case_insensitive) {
            str = str.toLowerCase();
          }
          str.split(' ').forEach(function(kw) {
            var pair = kw.split('|');
            compiled_keywords[pair[0]] = [className, pair[1] ? Number(pair[1]) : 1];
          });
        };

        if (typeof mode.keywords == 'string') { // string
          flatten('keyword', mode.keywords);
        } else {
          Object.keys(mode.keywords).forEach(function (className) {
            flatten(className, mode.keywords[className]);
          });
        }
        mode.keywords = compiled_keywords;
      }
      mode.lexemesRe = langRe(mode.lexemes || /\b\w+\b/, true);

      if (parent) {
        if (mode.beginKeywords) {
          mode.begin = '\\b(' + mode.beginKeywords.split(' ').join('|') + ')\\b';
        }
        if (!mode.begin)
          mode.begin = /\B|\b/;
        mode.beginRe = langRe(mode.begin);
        if (!mode.end && !mode.endsWithParent)
          mode.end = /\B|\b/;
        if (mode.end)
          mode.endRe = langRe(mode.end);
        mode.terminator_end = reStr(mode.end) || '';
        if (mode.endsWithParent && parent.terminator_end)
          mode.terminator_end += (mode.end ? '|' : '') + parent.terminator_end;
      }
      if (mode.illegal)
        mode.illegalRe = langRe(mode.illegal);
      if (mode.relevance === undefined)
        mode.relevance = 1;
      if (!mode.contains) {
        mode.contains = [];
      }
      var expanded_contains = [];
      mode.contains.forEach(function(c) {
        if (c.variants) {
          c.variants.forEach(function(v) {expanded_contains.push(inherit(c, v));});
        } else {
          expanded_contains.push(c == 'self' ? mode : c);
        }
      });
      mode.contains = expanded_contains;
      mode.contains.forEach(function(c) {compileMode(c, mode);});

      if (mode.starts) {
        compileMode(mode.starts, parent);
      }

      var terminators =
        mode.contains.map(function(c) {
          return c.beginKeywords ? '\\.?(' + c.begin + ')\\.?' : c.begin;
        })
        .concat([mode.terminator_end, mode.illegal])
        .map(reStr)
        .filter(Boolean);
      mode.terminators = terminators.length ? langRe(terminators.join('|'), true) : {exec: function(/*s*/) {return null;}};
    }

    compileMode(language);
  }

  /*
  Core highlighting function. Accepts a language name, or an alias, and a
  string with the code to highlight. Returns an object with the following
  properties:

  - relevance (int)
  - value (an HTML string with highlighting markup)

  */
  function highlight(name, value, ignore_illegals, continuation) {

    function subMode(lexeme, mode) {
      for (var i = 0; i < mode.contains.length; i++) {
        if (testRe(mode.contains[i].beginRe, lexeme)) {
          return mode.contains[i];
        }
      }
    }

    function endOfMode(mode, lexeme) {
      if (testRe(mode.endRe, lexeme)) {
        while (mode.endsParent && mode.parent) {
          mode = mode.parent;
        }
        return mode;
      }
      if (mode.endsWithParent) {
        return endOfMode(mode.parent, lexeme);
      }
    }

    function isIllegal(lexeme, mode) {
      return !ignore_illegals && testRe(mode.illegalRe, lexeme);
    }

    function keywordMatch(mode, match) {
      var match_str = language.case_insensitive ? match[0].toLowerCase() : match[0];
      return mode.keywords.hasOwnProperty(match_str) && mode.keywords[match_str];
    }

    function buildSpan(classname, insideSpan, leaveOpen, noPrefix) {
      var classPrefix = noPrefix ? '' : options.classPrefix,
          openSpan    = '<span class="' + classPrefix,
          closeSpan   = leaveOpen ? '' : '</span>';

      openSpan += classname + '">';

      return openSpan + insideSpan + closeSpan;
    }

    function processKeywords() {
      if (!top.keywords)
        return escape(mode_buffer);
      var result = '';
      var last_index = 0;
      top.lexemesRe.lastIndex = 0;
      var match = top.lexemesRe.exec(mode_buffer);
      while (match) {
        result += escape(mode_buffer.substr(last_index, match.index - last_index));
        var keyword_match = keywordMatch(top, match);
        if (keyword_match) {
          relevance += keyword_match[1];
          result += buildSpan(keyword_match[0], escape(match[0]));
        } else {
          result += escape(match[0]);
        }
        last_index = top.lexemesRe.lastIndex;
        match = top.lexemesRe.exec(mode_buffer);
      }
      return result + escape(mode_buffer.substr(last_index));
    }

    function processSubLanguage() {
      if (top.subLanguage && !languages[top.subLanguage]) {
        return escape(mode_buffer);
      }
      var result = top.subLanguage ? highlight(top.subLanguage, mode_buffer, true, continuations[top.subLanguage]) : highlightAuto(mode_buffer);
      // Counting embedded language score towards the host language may be disabled
      // with zeroing the containing mode relevance. Usecase in point is Markdown that
      // allows XML everywhere and makes every XML snippet to have a much larger Markdown
      // score.
      if (top.relevance > 0) {
        relevance += result.relevance;
      }
      if (top.subLanguageMode == 'continuous') {
        continuations[top.subLanguage] = result.top;
      }
      return buildSpan(result.language, result.value, false, true);
    }

    function processBuffer() {
      return top.subLanguage !== undefined ? processSubLanguage() : processKeywords();
    }

    function startNewMode(mode, lexeme) {
      var markup = mode.className? buildSpan(mode.className, '', true): '';
      if (mode.returnBegin) {
        result += markup;
        mode_buffer = '';
      } else if (mode.excludeBegin) {
        result += escape(lexeme) + markup;
        mode_buffer = '';
      } else {
        result += markup;
        mode_buffer = lexeme;
      }
      top = Object.create(mode, {parent: {value: top}});
    }

    function processLexeme(buffer, lexeme) {

      mode_buffer += buffer;
      if (lexeme === undefined) {
        result += processBuffer();
        return 0;
      }

      var new_mode = subMode(lexeme, top);
      if (new_mode) {
        result += processBuffer();
        startNewMode(new_mode, lexeme);
        return new_mode.returnBegin ? 0 : lexeme.length;
      }

      var end_mode = endOfMode(top, lexeme);
      if (end_mode) {
        var origin = top;
        if (!(origin.returnEnd || origin.excludeEnd)) {
          mode_buffer += lexeme;
        }
        result += processBuffer();
        do {
          if (top.className) {
            result += '</span>';
          }
          relevance += top.relevance;
          top = top.parent;
        } while (top != end_mode.parent);
        if (origin.excludeEnd) {
          result += escape(lexeme);
        }
        mode_buffer = '';
        if (end_mode.starts) {
          startNewMode(end_mode.starts, '');
        }
        return origin.returnEnd ? 0 : lexeme.length;
      }

      if (isIllegal(lexeme, top))
        throw new Error('Illegal lexeme "' + lexeme + '" for mode "' + (top.className || '<unnamed>') + '"');

      /*
      Parser should not reach this point as all types of lexemes should be caught
      earlier, but if it does due to some bug make sure it advances at least one
      character forward to prevent infinite looping.
      */
      mode_buffer += lexeme;
      return lexeme.length || 1;
    }

    var language = getLanguage(name);
    if (!language) {
      throw new Error('Unknown language: "' + name + '"');
    }

    compileLanguage(language);
    var top = continuation || language;
    var continuations = {}; // keep continuations for sub-languages
    var result = '', current;
    for(current = top; current != language; current = current.parent) {
      if (current.className) {
        result = buildSpan(current.className, '', true) + result;
      }
    }
    var mode_buffer = '';
    var relevance = 0;
    try {
      var match, count, index = 0;
      while (true) {
        top.terminators.lastIndex = index;
        match = top.terminators.exec(value);
        if (!match)
          break;
        count = processLexeme(value.substr(index, match.index - index), match[0]);
        index = match.index + count;
      }
      processLexeme(value.substr(index));
      for(current = top; current.parent; current = current.parent) { // close dangling modes
        if (current.className) {
          result += '</span>';
        }
      }
      return {
        relevance: relevance,
        value: result,
        language: name,
        top: top
      };
    } catch (e) {
      if (e.message.indexOf('Illegal') != -1) {
        return {
          relevance: 0,
          value: escape(value)
        };
      } else {
        throw e;
      }
    }
  }

  /*
  Highlighting with language detection. Accepts a string with the code to
  highlight. Returns an object with the following properties:

  - language (detected language)
  - relevance (int)
  - value (an HTML string with highlighting markup)
  - second_best (object with the same structure for second-best heuristically
    detected language, may be absent)

  */
  function highlightAuto(text, languageSubset) {
    languageSubset = languageSubset || options.languages || Object.keys(languages);
    var result = {
      relevance: 0,
      value: escape(text)
    };
    var second_best = result;
    languageSubset.forEach(function(name) {
      if (!getLanguage(name)) {
        return;
      }
      var current = highlight(name, text, false);
      current.language = name;
      if (current.relevance > second_best.relevance) {
        second_best = current;
      }
      if (current.relevance > result.relevance) {
        second_best = result;
        result = current;
      }
    });
    if (second_best.language) {
      result.second_best = second_best;
    }
    return result;
  }

  /*
  Post-processing of the highlighted markup:

  - replace TABs with something more useful
  - replace real line-breaks with '<br>' for non-pre containers

  */
  function fixMarkup(value) {
    if (options.tabReplace) {
      value = value.replace(/^((<[^>]+>|\t)+)/gm, function(match, p1 /*..., offset, s*/) {
        return p1.replace(/\t/g, options.tabReplace);
      });
    }
    if (options.useBR) {
      value = value.replace(/\n/g, '<br>');
    }
    return value;
  }

  function buildClassName(prevClassName, currentLang, resultLang) {
    var language = currentLang ? aliases[currentLang] : resultLang,
        result   = [prevClassName.trim()];

    if (!prevClassName.match(/\bhljs\b/)) {
      result.push('hljs');
    }

    if (prevClassName.indexOf(language) === -1) {
      result.push(language);
    }

    return result.join(' ').trim();
  }

  /*
  Applies highlighting to a DOM node containing code. Accepts a DOM node and
  two optional parameters for fixMarkup.
  */
  function highlightBlock(block) {
    var language = blockLanguage(block);
    if (isNotHighlighted(language))
        return;

    var node;
    if (options.useBR) {
      node = document.createElementNS('http://www.w3.org/1999/xhtml', 'div');
      node.innerHTML = block.innerHTML.replace(/\n/g, '').replace(/<br[ \/]*>/g, '\n');
    } else {
      node = block;
    }
    var text = node.textContent;
    var result = language ? highlight(language, text, true) : highlightAuto(text);

    var originalStream = nodeStream(node);
    if (originalStream.length) {
      var resultNode = document.createElementNS('http://www.w3.org/1999/xhtml', 'div');
      resultNode.innerHTML = result.value;
      result.value = mergeStreams(originalStream, nodeStream(resultNode), text);
    }
    result.value = fixMarkup(result.value);

    block.innerHTML = result.value;
    block.className = buildClassName(block.className, language, result.language);
    block.result = {
      language: result.language,
      re: result.relevance
    };
    if (result.second_best) {
      block.second_best = {
        language: result.second_best.language,
        re: result.second_best.relevance
      };
    }
  }

  var options = {
    classPrefix: 'hljs-',
    tabReplace: null,
    useBR: false,
    languages: undefined
  };

  /*
  Updates highlight.js global options with values passed in the form of an object
  */
  function configure(user_options) {
    options = inherit(options, user_options);
  }

  /*
  Applies highlighting to all <pre><code>..</code></pre> blocks on a page.
  */
  function initHighlighting() {
    if (initHighlighting.called)
      return;
    initHighlighting.called = true;

    var blocks = document.querySelectorAll('pre code');
    Array.prototype.forEach.call(blocks, highlightBlock);
  }

  /*
  Attaches highlighting to the page load event.
  */
  function initHighlightingOnLoad() {
    addEventListener('DOMContentLoaded', initHighlighting, false);
    addEventListener('load', initHighlighting, false);
  }

  var languages = {};
  var aliases = {};

  function registerLanguage(name, language) {
    var lang = languages[name] = language(hljs);
    if (lang.aliases) {
      lang.aliases.forEach(function(alias) {aliases[alias] = name;});
    }
  }

  function listLanguages() {
    return Object.keys(languages);
  }

  function getLanguage(name) {
    return languages[name] || languages[aliases[name]];
  }

  /* Interface definition */

  hljs.highlight = highlight;
  hljs.highlightAuto = highlightAuto;
  hljs.fixMarkup = fixMarkup;
  hljs.highlightBlock = highlightBlock;
  hljs.configure = configure;
  hljs.initHighlighting = initHighlighting;
  hljs.initHighlightingOnLoad = initHighlightingOnLoad;
  hljs.registerLanguage = registerLanguage;
  hljs.listLanguages = listLanguages;
  hljs.getLanguage = getLanguage;
  hljs.inherit = inherit;

  // Common regexps
  hljs.IDENT_RE = '[a-zA-Z]\\w*';
  hljs.UNDERSCORE_IDENT_RE = '[a-zA-Z_]\\w*';
  hljs.NUMBER_RE = '\\b\\d+(\\.\\d+)?';
  hljs.C_NUMBER_RE = '\\b(0[xX][a-fA-F0-9]+|(\\d+(\\.\\d*)?|\\.\\d+)([eE][-+]?\\d+)?)'; // 0x..., 0..., decimal, float
  hljs.BINARY_NUMBER_RE = '\\b(0b[01]+)'; // 0b...
  hljs.RE_STARTERS_RE = '!|!=|!==|%|%=|&|&&|&=|\\*|\\*=|\\+|\\+=|,|-|-=|/=|/|:|;|<<|<<=|<=|<|===|==|=|>>>=|>>=|>=|>>>|>>|>|\\?|\\[|\\{|\\(|\\^|\\^=|\\||\\|=|\\|\\||~';

  // Common modes
  hljs.BACKSLASH_ESCAPE = {
    begin: '\\\\[\\s\\S]', relevance: 0
  };
  hljs.APOS_STRING_MODE = {
    className: 'string',
    begin: '\'', end: '\'',
    illegal: '\\n',
    contains: [hljs.BACKSLASH_ESCAPE]
  };
  hljs.QUOTE_STRING_MODE = {
    className: 'string',
    begin: '"', end: '"',
    illegal: '\\n',
    contains: [hljs.BACKSLASH_ESCAPE]
  };
  hljs.PHRASAL_WORDS_MODE = {
    begin: /\b(a|an|the|are|I|I'm|isn't|don't|doesn't|won't|but|just|should|pretty|simply|enough|gonna|going|wtf|so|such)\b/
  };
  hljs.COMMENT = function (begin, end, inherits) {
    var mode = hljs.inherit(
      {
        className: 'comment',
        begin: begin, end: end,
        contains: []
      },
      inherits || {}
    );
    mode.contains.push(hljs.PHRASAL_WORDS_MODE);
    mode.contains.push({
      className: 'doctag',
      beginKeywords: "TODO FIXME NOTE BUG XXX",
      relevance: 0
    });
    return mode;
  };
  hljs.C_LINE_COMMENT_MODE = hljs.COMMENT('//', '$');
  hljs.C_BLOCK_COMMENT_MODE = hljs.COMMENT('/\\*', '\\*/');
  hljs.HASH_COMMENT_MODE = hljs.COMMENT('#', '$');
  hljs.NUMBER_MODE = {
    className: 'number',
    begin: hljs.NUMBER_RE,
    relevance: 0
  };
  hljs.C_NUMBER_MODE = {
    className: 'number',
    begin: hljs.C_NUMBER_RE,
    relevance: 0
  };
  hljs.BINARY_NUMBER_MODE = {
    className: 'number',
    begin: hljs.BINARY_NUMBER_RE,
    relevance: 0
  };
  hljs.CSS_NUMBER_MODE = {
    className: 'number',
    begin: hljs.NUMBER_RE + '(' +
      '%|em|ex|ch|rem'  +
      '|vw|vh|vmin|vmax' +
      '|cm|mm|in|pt|pc|px' +
      '|deg|grad|rad|turn' +
      '|s|ms' +
      '|Hz|kHz' +
      '|dpi|dpcm|dppx' +
      ')?',
    relevance: 0
  };
  hljs.REGEXP_MODE = {
    className: 'regexp',
    begin: /\//, end: /\/[gimuy]*/,
    illegal: /\n/,
    contains: [
      hljs.BACKSLASH_ESCAPE,
      {
        begin: /\[/, end: /\]/,
        relevance: 0,
        contains: [hljs.BACKSLASH_ESCAPE]
      }
    ]
  };
  hljs.TITLE_MODE = {
    className: 'title',
    begin: hljs.IDENT_RE,
    relevance: 0
  };
  hljs.UNDERSCORE_TITLE_MODE = {
    className: 'title',
    begin: hljs.UNDERSCORE_IDENT_RE,
    relevance: 0
  };

  return hljs;
}));

},{}],15:[function(require,module,exports){
var hljs = require('./highlight');

hljs.registerLanguage('1c', require('./languages/1c'));
hljs.registerLanguage('actionscript', require('./languages/actionscript'));
hljs.registerLanguage('apache', require('./languages/apache'));
hljs.registerLanguage('applescript', require('./languages/applescript'));
hljs.registerLanguage('armasm', require('./languages/armasm'));
hljs.registerLanguage('xml', require('./languages/xml'));
hljs.registerLanguage('asciidoc', require('./languages/asciidoc'));
hljs.registerLanguage('aspectj', require('./languages/aspectj'));
hljs.registerLanguage('autohotkey', require('./languages/autohotkey'));
hljs.registerLanguage('avrasm', require('./languages/avrasm'));
hljs.registerLanguage('axapta', require('./languages/axapta'));
hljs.registerLanguage('bash', require('./languages/bash'));
hljs.registerLanguage('brainfuck', require('./languages/brainfuck'));
hljs.registerLanguage('cal', require('./languages/cal'));
hljs.registerLanguage('capnproto', require('./languages/capnproto'));
hljs.registerLanguage('ceylon', require('./languages/ceylon'));
hljs.registerLanguage('clojure', require('./languages/clojure'));
hljs.registerLanguage('clojure-repl', require('./languages/clojure-repl'));
hljs.registerLanguage('cmake', require('./languages/cmake'));
hljs.registerLanguage('coffeescript', require('./languages/coffeescript'));
hljs.registerLanguage('cpp', require('./languages/cpp'));
hljs.registerLanguage('cs', require('./languages/cs'));
hljs.registerLanguage('css', require('./languages/css'));
hljs.registerLanguage('d', require('./languages/d'));
hljs.registerLanguage('markdown', require('./languages/markdown'));
hljs.registerLanguage('dart', require('./languages/dart'));
hljs.registerLanguage('delphi', require('./languages/delphi'));
hljs.registerLanguage('diff', require('./languages/diff'));
hljs.registerLanguage('django', require('./languages/django'));
hljs.registerLanguage('dns', require('./languages/dns'));
hljs.registerLanguage('dockerfile', require('./languages/dockerfile'));
hljs.registerLanguage('dos', require('./languages/dos'));
hljs.registerLanguage('dust', require('./languages/dust'));
hljs.registerLanguage('elixir', require('./languages/elixir'));
hljs.registerLanguage('ruby', require('./languages/ruby'));
hljs.registerLanguage('erb', require('./languages/erb'));
hljs.registerLanguage('erlang-repl', require('./languages/erlang-repl'));
hljs.registerLanguage('erlang', require('./languages/erlang'));
hljs.registerLanguage('fix', require('./languages/fix'));
hljs.registerLanguage('fortran', require('./languages/fortran'));
hljs.registerLanguage('fsharp', require('./languages/fsharp'));
hljs.registerLanguage('gcode', require('./languages/gcode'));
hljs.registerLanguage('gherkin', require('./languages/gherkin'));
hljs.registerLanguage('glsl', require('./languages/glsl'));
hljs.registerLanguage('go', require('./languages/go'));
hljs.registerLanguage('gradle', require('./languages/gradle'));
hljs.registerLanguage('groovy', require('./languages/groovy'));
hljs.registerLanguage('haml', require('./languages/haml'));
hljs.registerLanguage('handlebars', require('./languages/handlebars'));
hljs.registerLanguage('haskell', require('./languages/haskell'));
hljs.registerLanguage('haxe', require('./languages/haxe'));
hljs.registerLanguage('http', require('./languages/http'));
hljs.registerLanguage('inform7', require('./languages/inform7'));
hljs.registerLanguage('ini', require('./languages/ini'));
hljs.registerLanguage('java', require('./languages/java'));
hljs.registerLanguage('javascript', require('./languages/javascript'));
hljs.registerLanguage('json', require('./languages/json'));
hljs.registerLanguage('julia', require('./languages/julia'));
hljs.registerLanguage('kotlin', require('./languages/kotlin'));
hljs.registerLanguage('lasso', require('./languages/lasso'));
hljs.registerLanguage('less', require('./languages/less'));
hljs.registerLanguage('lisp', require('./languages/lisp'));
hljs.registerLanguage('livecodeserver', require('./languages/livecodeserver'));
hljs.registerLanguage('livescript', require('./languages/livescript'));
hljs.registerLanguage('lua', require('./languages/lua'));
hljs.registerLanguage('makefile', require('./languages/makefile'));
hljs.registerLanguage('mathematica', require('./languages/mathematica'));
hljs.registerLanguage('matlab', require('./languages/matlab'));
hljs.registerLanguage('mel', require('./languages/mel'));
hljs.registerLanguage('mercury', require('./languages/mercury'));
hljs.registerLanguage('mizar', require('./languages/mizar'));
hljs.registerLanguage('monkey', require('./languages/monkey'));
hljs.registerLanguage('nginx', require('./languages/nginx'));
hljs.registerLanguage('nimrod', require('./languages/nimrod'));
hljs.registerLanguage('nix', require('./languages/nix'));
hljs.registerLanguage('nsis', require('./languages/nsis'));
hljs.registerLanguage('objectivec', require('./languages/objectivec'));
hljs.registerLanguage('ocaml', require('./languages/ocaml'));
hljs.registerLanguage('openscad', require('./languages/openscad'));
hljs.registerLanguage('oxygene', require('./languages/oxygene'));
hljs.registerLanguage('parser3', require('./languages/parser3'));
hljs.registerLanguage('perl', require('./languages/perl'));
hljs.registerLanguage('pf', require('./languages/pf'));
hljs.registerLanguage('php', require('./languages/php'));
hljs.registerLanguage('powershell', require('./languages/powershell'));
hljs.registerLanguage('processing', require('./languages/processing'));
hljs.registerLanguage('profile', require('./languages/profile'));
hljs.registerLanguage('prolog', require('./languages/prolog'));
hljs.registerLanguage('protobuf', require('./languages/protobuf'));
hljs.registerLanguage('puppet', require('./languages/puppet'));
hljs.registerLanguage('python', require('./languages/python'));
hljs.registerLanguage('q', require('./languages/q'));
hljs.registerLanguage('r', require('./languages/r'));
hljs.registerLanguage('rib', require('./languages/rib'));
hljs.registerLanguage('roboconf', require('./languages/roboconf'));
hljs.registerLanguage('rsl', require('./languages/rsl'));
hljs.registerLanguage('ruleslanguage', require('./languages/ruleslanguage'));
hljs.registerLanguage('rust', require('./languages/rust'));
hljs.registerLanguage('scala', require('./languages/scala'));
hljs.registerLanguage('scheme', require('./languages/scheme'));
hljs.registerLanguage('scilab', require('./languages/scilab'));
hljs.registerLanguage('scss', require('./languages/scss'));
hljs.registerLanguage('smali', require('./languages/smali'));
hljs.registerLanguage('smalltalk', require('./languages/smalltalk'));
hljs.registerLanguage('sml', require('./languages/sml'));
hljs.registerLanguage('sql', require('./languages/sql'));
hljs.registerLanguage('stata', require('./languages/stata'));
hljs.registerLanguage('step21', require('./languages/step21'));
hljs.registerLanguage('stylus', require('./languages/stylus'));
hljs.registerLanguage('swift', require('./languages/swift'));
hljs.registerLanguage('tcl', require('./languages/tcl'));
hljs.registerLanguage('tex', require('./languages/tex'));
hljs.registerLanguage('thrift', require('./languages/thrift'));
hljs.registerLanguage('tp', require('./languages/tp'));
hljs.registerLanguage('twig', require('./languages/twig'));
hljs.registerLanguage('typescript', require('./languages/typescript'));
hljs.registerLanguage('vala', require('./languages/vala'));
hljs.registerLanguage('vbnet', require('./languages/vbnet'));
hljs.registerLanguage('vbscript', require('./languages/vbscript'));
hljs.registerLanguage('vbscript-html', require('./languages/vbscript-html'));
hljs.registerLanguage('verilog', require('./languages/verilog'));
hljs.registerLanguage('vhdl', require('./languages/vhdl'));
hljs.registerLanguage('vim', require('./languages/vim'));
hljs.registerLanguage('x86asm', require('./languages/x86asm'));
hljs.registerLanguage('xl', require('./languages/xl'));

module.exports = hljs;
},{"./highlight":14,"./languages/1c":16,"./languages/actionscript":17,"./languages/apache":18,"./languages/applescript":19,"./languages/armasm":20,"./languages/asciidoc":21,"./languages/aspectj":22,"./languages/autohotkey":23,"./languages/avrasm":24,"./languages/axapta":25,"./languages/bash":26,"./languages/brainfuck":27,"./languages/cal":28,"./languages/capnproto":29,"./languages/ceylon":30,"./languages/clojure":32,"./languages/clojure-repl":31,"./languages/cmake":33,"./languages/coffeescript":34,"./languages/cpp":35,"./languages/cs":36,"./languages/css":37,"./languages/d":38,"./languages/dart":39,"./languages/delphi":40,"./languages/diff":41,"./languages/django":42,"./languages/dns":43,"./languages/dockerfile":44,"./languages/dos":45,"./languages/dust":46,"./languages/elixir":47,"./languages/erb":48,"./languages/erlang":50,"./languages/erlang-repl":49,"./languages/fix":51,"./languages/fortran":52,"./languages/fsharp":53,"./languages/gcode":54,"./languages/gherkin":55,"./languages/glsl":56,"./languages/go":57,"./languages/gradle":58,"./languages/groovy":59,"./languages/haml":60,"./languages/handlebars":61,"./languages/haskell":62,"./languages/haxe":63,"./languages/http":64,"./languages/inform7":65,"./languages/ini":66,"./languages/java":67,"./languages/javascript":68,"./languages/json":69,"./languages/julia":70,"./languages/kotlin":71,"./languages/lasso":72,"./languages/less":73,"./languages/lisp":74,"./languages/livecodeserver":75,"./languages/livescript":76,"./languages/lua":77,"./languages/makefile":78,"./languages/markdown":79,"./languages/mathematica":80,"./languages/matlab":81,"./languages/mel":82,"./languages/mercury":83,"./languages/mizar":84,"./languages/monkey":85,"./languages/nginx":86,"./languages/nimrod":87,"./languages/nix":88,"./languages/nsis":89,"./languages/objectivec":90,"./languages/ocaml":91,"./languages/openscad":92,"./languages/oxygene":93,"./languages/parser3":94,"./languages/perl":95,"./languages/pf":96,"./languages/php":97,"./languages/powershell":98,"./languages/processing":99,"./languages/profile":100,"./languages/prolog":101,"./languages/protobuf":102,"./languages/puppet":103,"./languages/python":104,"./languages/q":105,"./languages/r":106,"./languages/rib":107,"./languages/roboconf":108,"./languages/rsl":109,"./languages/ruby":110,"./languages/ruleslanguage":111,"./languages/rust":112,"./languages/scala":113,"./languages/scheme":114,"./languages/scilab":115,"./languages/scss":116,"./languages/smali":117,"./languages/smalltalk":118,"./languages/sml":119,"./languages/sql":120,"./languages/stata":121,"./languages/step21":122,"./languages/stylus":123,"./languages/swift":124,"./languages/tcl":125,"./languages/tex":126,"./languages/thrift":127,"./languages/tp":128,"./languages/twig":129,"./languages/typescript":130,"./languages/vala":131,"./languages/vbnet":132,"./languages/vbscript":134,"./languages/vbscript-html":133,"./languages/verilog":135,"./languages/vhdl":136,"./languages/vim":137,"./languages/x86asm":138,"./languages/xl":139,"./languages/xml":140}],16:[function(require,module,exports){
module.exports = function(hljs){
  var IDENT_RE_RU = '[a-zA-Zа-яА-Я][a-zA-Z0-9_а-яА-Я]*';
  var OneS_KEYWORDS = 'возврат дата для если и или иначе иначеесли исключение конецесли ' +
    'конецпопытки конецпроцедуры конецфункции конеццикла константа не перейти перем ' +
    'перечисление по пока попытка прервать продолжить процедура строка тогда фс функция цикл ' +
    'число экспорт';
  var OneS_BUILT_IN = 'ansitooem oemtoansi ввестивидсубконто ввестидату ввестизначение ' +
    'ввестиперечисление ввестипериод ввестиплансчетов ввестистроку ввестичисло вопрос ' +
    'восстановитьзначение врег выбранныйплансчетов вызватьисключение датагод датамесяц ' +
    'датачисло добавитьмесяц завершитьработусистемы заголовоксистемы записьжурналарегистрации ' +
    'запуститьприложение зафиксироватьтранзакцию значениевстроку значениевстрокувнутр ' +
    'значениевфайл значениеизстроки значениеизстрокивнутр значениеизфайла имякомпьютера ' +
    'имяпользователя каталогвременныхфайлов каталогиб каталогпользователя каталогпрограммы ' +
    'кодсимв командасистемы конгода конецпериодаби конецрассчитанногопериодаби ' +
    'конецстандартногоинтервала конквартала конмесяца коннедели лев лог лог10 макс ' +
    'максимальноеколичествосубконто мин монопольныйрежим названиеинтерфейса названиенабораправ ' +
    'назначитьвид назначитьсчет найти найтипомеченныенаудаление найтиссылки началопериодаби ' +
    'началостандартногоинтервала начатьтранзакцию начгода начквартала начмесяца начнедели ' +
    'номерднягода номерднянедели номернеделигода нрег обработкаожидания окр описаниеошибки ' +
    'основнойжурналрасчетов основнойплансчетов основнойязык открытьформу открытьформумодально ' +
    'отменитьтранзакцию очиститьокносообщений периодстр полноеимяпользователя получитьвремята ' +
    'получитьдатута получитьдокументта получитьзначенияотбора получитьпозициюта ' +
    'получитьпустоезначение получитьта прав праводоступа предупреждение префиксавтонумерации ' +
    'пустаястрока пустоезначение рабочаядаттьпустоезначение рабочаядата разделительстраниц ' +
    'разделительстрок разм разобратьпозициюдокумента рассчитатьрегистрына ' +
    'рассчитатьрегистрыпо сигнал симв символтабуляции создатьобъект сокрл сокрлп сокрп ' +
    'сообщить состояние сохранитьзначение сред статусвозврата стрдлина стрзаменить ' +
    'стрколичествострок стрполучитьстроку  стрчисловхождений сформироватьпозициюдокумента ' +
    'счетпокоду текущаядата текущеевремя типзначения типзначениястр удалитьобъекты ' +
    'установитьтана установитьтапо фиксшаблон формат цел шаблон';
  var DQUOTE =  {className: 'dquote',  begin: '""'};
  var STR_START = {
      className: 'string',
      begin: '"', end: '"|$',
      contains: [DQUOTE]
    };
  var STR_CONT = {
    className: 'string',
    begin: '\\|', end: '"|$',
    contains: [DQUOTE]
  };

  return {
    case_insensitive: true,
    lexemes: IDENT_RE_RU,
    keywords: {keyword: OneS_KEYWORDS, built_in: OneS_BUILT_IN},
    contains: [
      hljs.C_LINE_COMMENT_MODE,
      hljs.NUMBER_MODE,
      STR_START, STR_CONT,
      {
        className: 'function',
        begin: '(процедура|функция)', end: '$',
        lexemes: IDENT_RE_RU,
        keywords: 'процедура функция',
        contains: [
          hljs.inherit(hljs.TITLE_MODE, {begin: IDENT_RE_RU}),
          {
            className: 'tail',
            endsWithParent: true,
            contains: [
              {
                className: 'params',
                begin: '\\(', end: '\\)',
                lexemes: IDENT_RE_RU,
                keywords: 'знач',
                contains: [STR_START, STR_CONT]
              },
              {
                className: 'export',
                begin: 'экспорт', endsWithParent: true,
                lexemes: IDENT_RE_RU,
                keywords: 'экспорт',
                contains: [hljs.C_LINE_COMMENT_MODE]
              }
            ]
          },
          hljs.C_LINE_COMMENT_MODE
        ]
      },
      {className: 'preprocessor', begin: '#', end: '$'},
      {className: 'date', begin: '\'\\d{2}\\.\\d{2}\\.(\\d{2}|\\d{4})\''}
    ]
  };
};
},{}],17:[function(require,module,exports){
module.exports = function(hljs) {
  var IDENT_RE = '[a-zA-Z_$][a-zA-Z0-9_$]*';
  var IDENT_FUNC_RETURN_TYPE_RE = '([*]|[a-zA-Z_$][a-zA-Z0-9_$]*)';

  var AS3_REST_ARG_MODE = {
    className: 'rest_arg',
    begin: '[.]{3}', end: IDENT_RE,
    relevance: 10
  };

  return {
    aliases: ['as'],
    keywords: {
      keyword: 'as break case catch class const continue default delete do dynamic each ' +
        'else extends final finally for function get if implements import in include ' +
        'instanceof interface internal is namespace native new override package private ' +
        'protected public return set static super switch this throw try typeof use var void ' +
        'while with',
      literal: 'true false null undefined'
    },
    contains: [
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE,
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      hljs.C_NUMBER_MODE,
      {
        className: 'package',
        beginKeywords: 'package', end: '{',
        contains: [hljs.TITLE_MODE]
      },
      {
        className: 'class',
        beginKeywords: 'class interface', end: '{', excludeEnd: true,
        contains: [
          {
            beginKeywords: 'extends implements'
          },
          hljs.TITLE_MODE
        ]
      },
      {
        className: 'preprocessor',
        beginKeywords: 'import include', end: ';'
      },
      {
        className: 'function',
        beginKeywords: 'function', end: '[{;]', excludeEnd: true,
        illegal: '\\S',
        contains: [
          hljs.TITLE_MODE,
          {
            className: 'params',
            begin: '\\(', end: '\\)',
            contains: [
              hljs.APOS_STRING_MODE,
              hljs.QUOTE_STRING_MODE,
              hljs.C_LINE_COMMENT_MODE,
              hljs.C_BLOCK_COMMENT_MODE,
              AS3_REST_ARG_MODE
            ]
          },
          {
            className: 'type',
            begin: ':',
            end: IDENT_FUNC_RETURN_TYPE_RE,
            relevance: 10
          }
        ]
      }
    ]
  };
};
},{}],18:[function(require,module,exports){
module.exports = function(hljs) {
  var NUMBER = {className: 'number', begin: '[\\$%]\\d+'};
  return {
    aliases: ['apacheconf'],
    case_insensitive: true,
    contains: [
      hljs.HASH_COMMENT_MODE,
      {className: 'tag', begin: '</?', end: '>'},
      {
        className: 'keyword',
        begin: /\w+/,
        relevance: 0,
        // keywords aren’t needed for highlighting per se, they only boost relevance
        // for a very generally defined mode (starts with a word, ends with line-end
        keywords: {
          common:
            'order deny allow setenv rewriterule rewriteengine rewritecond documentroot ' +
            'sethandler errordocument loadmodule options header listen serverroot ' +
            'servername'
        },
        starts: {
          end: /$/,
          relevance: 0,
          keywords: {
            literal: 'on off all'
          },
          contains: [
            {
              className: 'sqbracket',
              begin: '\\s\\[', end: '\\]$'
            },
            {
              className: 'cbracket',
              begin: '[\\$%]\\{', end: '\\}',
              contains: ['self', NUMBER]
            },
            NUMBER,
            hljs.QUOTE_STRING_MODE
          ]
        }
      }
    ],
    illegal: /\S/
  };
};
},{}],19:[function(require,module,exports){
module.exports = function(hljs) {
  var STRING = hljs.inherit(hljs.QUOTE_STRING_MODE, {illegal: ''});
  var PARAMS = {
    className: 'params',
    begin: '\\(', end: '\\)',
    contains: ['self', hljs.C_NUMBER_MODE, STRING]
  };
  var COMMENT_MODE_1 = hljs.COMMENT('--', '$');
  var COMMENT_MODE_2 = hljs.COMMENT(
    '\\(\\*',
    '\\*\\)',
    {
      contains: ['self', COMMENT_MODE_1] //allow nesting
    }
  );
  var COMMENTS = [
    COMMENT_MODE_1,
    COMMENT_MODE_2,
    hljs.HASH_COMMENT_MODE
  ];

  return {
    aliases: ['osascript'],
    keywords: {
      keyword:
        'about above after against and around as at back before beginning ' +
        'behind below beneath beside between but by considering ' +
        'contain contains continue copy div does eighth else end equal ' +
        'equals error every exit fifth first for fourth from front ' +
        'get given global if ignoring in into is it its last local me ' +
        'middle mod my ninth not of on onto or over prop property put ref ' +
        'reference repeat returning script second set seventh since ' +
        'sixth some tell tenth that the|0 then third through thru ' +
        'timeout times to transaction try until where while whose with ' +
        'without',
      constant:
        'AppleScript false linefeed return pi quote result space tab true',
      type:
        'alias application boolean class constant date file integer list ' +
        'number real record string text',
      command:
        'activate beep count delay launch log offset read round ' +
        'run say summarize write',
      property:
        'character characters contents day frontmost id item length ' +
        'month name paragraph paragraphs rest reverse running time version ' +
        'weekday word words year'
    },
    contains: [
      STRING,
      hljs.C_NUMBER_MODE,
      {
        className: 'type',
        begin: '\\bPOSIX file\\b'
      },
      {
        className: 'command',
        begin:
          '\\b(clipboard info|the clipboard|info for|list (disks|folder)|' +
          'mount volume|path to|(close|open for) access|(get|set) eof|' +
          'current date|do shell script|get volume settings|random number|' +
          'set volume|system attribute|system info|time to GMT|' +
          '(load|run|store) script|scripting components|' +
          'ASCII (character|number)|localized string|' +
          'choose (application|color|file|file name|' +
          'folder|from list|remote application|URL)|' +
          'display (alert|dialog))\\b|^\\s*return\\b'
      },
      {
        className: 'constant',
        begin:
          '\\b(text item delimiters|current application|missing value)\\b'
      },
      {
        className: 'keyword',
        begin:
          '\\b(apart from|aside from|instead of|out of|greater than|' +
          "isn't|(doesn't|does not) (equal|come before|come after|contain)|" +
          '(greater|less) than( or equal)?|(starts?|ends|begins?) with|' +
          'contained by|comes (before|after)|a (ref|reference))\\b'
      },
      {
        className: 'property',
        begin:
          '\\b(POSIX path|(date|time) string|quoted form)\\b'
      },
      {
        className: 'function_start',
        beginKeywords: 'on',
        illegal: '[${=;\\n]',
        contains: [hljs.UNDERSCORE_TITLE_MODE, PARAMS]
      }
    ].concat(COMMENTS),
    illegal: '//|->|=>'
  };
};
},{}],20:[function(require,module,exports){
module.exports = function(hljs) {
    //local labels: %?[FB]?[AT]?\d{1,2}\w+
  return {
    case_insensitive: true,
    aliases: ['arm'],
    lexemes: '\\.?' + hljs.IDENT_RE,
    keywords: {
      literal:
        'r0 r1 r2 r3 r4 r5 r6 r7 r8 r9 r10 r11 r12 r13 r14 r15 '+ //standard registers
        'pc lr sp ip sl sb fp '+ //typical regs plus backward compatibility
        'a1 a2 a3 a4 v1 v2 v3 v4 v5 v6 v7 v8 f0 f1 f2 f3 f4 f5 f6 f7 '+ //more regs and fp
        'p0 p1 p2 p3 p4 p5 p6 p7 p8 p9 p10 p11 p12 p13 p14 p15 '+ //coprocessor regs
        'c0 c1 c2 c3 c4 c5 c6 c7 c8 c9 c10 c11 c12 c13 c14 c15 '+ //more coproc
        'q0 q1 q2 q3 q4 q5 q6 q7 q8 q9 q10 q11 q12 q13 q14 q15 '+ //advanced SIMD NEON regs

        //program status registers
        'cpsr_c cpsr_x cpsr_s cpsr_f cpsr_cx cpsr_cxs cpsr_xs cpsr_xsf cpsr_sf cpsr_cxsf '+
        'spsr_c spsr_x spsr_s spsr_f spsr_cx spsr_cxs spsr_xs spsr_xsf spsr_sf spsr_cxsf '+

        //NEON and VFP registers
        's0 s1 s2 s3 s4 s5 s6 s7 s8 s9 s10 s11 s12 s13 s14 s15 '+
        's16 s17 s18 s19 s20 s21 s22 s23 s24 s25 s26 s27 s28 s29 s30 s31 '+
        'd0 d1 d2 d3 d4 d5 d6 d7 d8 d9 d10 d11 d12 d13 d14 d15 '+
        'd16 d17 d18 d19 d20 d21 d22 d23 d24 d25 d26 d27 d28 d29 d30 d31 ',
    preprocessor:
        //GNU preprocs
        '.2byte .4byte .align .ascii .asciz .balign .byte .code .data .else .end .endif .endm .endr .equ .err .exitm .extern .global .hword .if .ifdef .ifndef .include .irp .long .macro .rept .req .section .set .skip .space .text .word .arm .thumb .code16 .code32 .force_thumb .thumb_func .ltorg '+
        //ARM directives
        'ALIAS ALIGN ARM AREA ASSERT ATTR CN CODE CODE16 CODE32 COMMON CP DATA DCB DCD DCDU DCDO DCFD DCFDU DCI DCQ DCQU DCW DCWU DN ELIF ELSE END ENDFUNC ENDIF ENDP ENTRY EQU EXPORT EXPORTAS EXTERN FIELD FILL FUNCTION GBLA GBLL GBLS GET GLOBAL IF IMPORT INCBIN INCLUDE INFO KEEP LCLA LCLL LCLS LTORG MACRO MAP MEND MEXIT NOFP OPT PRESERVE8 PROC QN READONLY RELOC REQUIRE REQUIRE8 RLIST FN ROUT SETA SETL SETS SN SPACE SUBT THUMB THUMBX TTL WHILE WEND ',
    built_in:
        '{PC} {VAR} {TRUE} {FALSE} {OPT} {CONFIG} {ENDIAN} {CODESIZE} {CPU} {FPU} {ARCHITECTURE} {PCSTOREOFFSET} {ARMASM_VERSION} {INTER} {ROPI} {RWPI} {SWST} {NOSWST} . @ '
    },
    contains: [
      {
        className: 'keyword',
        begin: '\\b('+     //mnemonics
            'adc|'+
            '(qd?|sh?|u[qh]?)?add(8|16)?|usada?8|(q|sh?|u[qh]?)?(as|sa)x|'+
            'and|adrl?|sbc|rs[bc]|asr|b[lx]?|blx|bxj|cbn?z|tb[bh]|bic|'+
            'bfc|bfi|[su]bfx|bkpt|cdp2?|clz|clrex|cmp|cmn|cpsi[ed]|cps|'+
            'setend|dbg|dmb|dsb|eor|isb|it[te]{0,3}|lsl|lsr|ror|rrx|'+
            'ldm(([id][ab])|f[ds])?|ldr((s|ex)?[bhd])?|movt?|mvn|mra|mar|'+
            'mul|[us]mull|smul[bwt][bt]|smu[as]d|smmul|smmla|'+
            'mla|umlaal|smlal?([wbt][bt]|d)|mls|smlsl?[ds]|smc|svc|sev|'+
            'mia([bt]{2}|ph)?|mrr?c2?|mcrr2?|mrs|msr|orr|orn|pkh(tb|bt)|rbit|'+
            'rev(16|sh)?|sel|[su]sat(16)?|nop|pop|push|rfe([id][ab])?|'+
            'stm([id][ab])?|str(ex)?[bhd]?|(qd?)?sub|(sh?|q|u[qh]?)?sub(8|16)|'+
            '[su]xt(a?h|a?b(16)?)|srs([id][ab])?|swpb?|swi|smi|tst|teq|'+
            'wfe|wfi|yield'+
        ')'+
        '(eq|ne|cs|cc|mi|pl|vs|vc|hi|ls|ge|lt|gt|le|al|hs|lo)?'+ //condition codes
        '[sptrx]?' ,                                             //legal postfixes
        end: '\\s'
      },
      hljs.COMMENT('[;@]', '$', {relevance: 0}),
      hljs.C_BLOCK_COMMENT_MODE,
      hljs.QUOTE_STRING_MODE,
      {
        className: 'string',
        begin: '\'',
        end: '[^\\\\]\'',
        relevance: 0
      },
      {
        className: 'title',
        begin: '\\|', end: '\\|',
        illegal: '\\n',
        relevance: 0
      },
      {
        className: 'number',
        variants: [
            {begin: '[#$=]?0x[0-9a-f]+'}, //hex
            {begin: '[#$=]?0b[01]+'},     //bin
            {begin: '[#$=]\\d+'},        //literal
            {begin: '\\b\\d+'}           //bare number
        ],
        relevance: 0
      },
      {
        className: 'label',
        variants: [
            {begin: '^[a-z_\\.\\$][a-z0-9_\\.\\$]+'}, //ARM syntax
            {begin: '^\\s*[a-z_\\.\\$][a-z0-9_\\.\\$]+:'}, //GNU ARM syntax
            {begin: '[=#]\\w+' }  //label reference
        ],
        relevance: 0
      }
    ]
  };
};
},{}],21:[function(require,module,exports){
module.exports = function(hljs) {
  return {
    aliases: ['adoc'],
    contains: [
      // block comment
      hljs.COMMENT(
        '^/{4,}\\n',
        '\\n/{4,}$',
        // can also be done as...
        //'^/{4,}$',
        //'^/{4,}$',
        {
          relevance: 10
        }
      ),
      // line comment
      hljs.COMMENT(
        '^//',
        '$',
        {
          relevance: 0
        }
      ),
      // title
      {
        className: 'title',
        begin: '^\\.\\w.*$'
      },
      // example, admonition & sidebar blocks
      {
        begin: '^[=\\*]{4,}\\n',
        end: '\\n^[=\\*]{4,}$',
        relevance: 10
      },
      // headings
      {
        className: 'header',
        begin: '^(={1,5}) .+?( \\1)?$',
        relevance: 10
      },
      {
        className: 'header',
        begin: '^[^\\[\\]\\n]+?\\n[=\\-~\\^\\+]{2,}$',
        relevance: 10
      },
      // document attributes
      {
        className: 'attribute',
        begin: '^:.+?:',
        end: '\\s',
        excludeEnd: true,
        relevance: 10
      },
      // block attributes
      {
        className: 'attribute',
        begin: '^\\[.+?\\]$',
        relevance: 0
      },
      // quoteblocks
      {
        className: 'blockquote',
        begin: '^_{4,}\\n',
        end: '\\n_{4,}$',
        relevance: 10
      },
      // listing and literal blocks
      {
        className: 'code',
        begin: '^[\\-\\.]{4,}\\n',
        end: '\\n[\\-\\.]{4,}$',
        relevance: 10
      },
      // passthrough blocks
      {
        begin: '^\\+{4,}\\n',
        end: '\\n\\+{4,}$',
        contains: [
          {
            begin: '<', end: '>',
            subLanguage: 'xml',
            relevance: 0
          }
        ],
        relevance: 10
      },
      // lists (can only capture indicators)
      {
        className: 'bullet',
        begin: '^(\\*+|\\-+|\\.+|[^\\n]+?::)\\s+'
      },
      // admonition
      {
        className: 'label',
        begin: '^(NOTE|TIP|IMPORTANT|WARNING|CAUTION):\\s+',
        relevance: 10
      },
      // inline strong
      {
        className: 'strong',
        // must not follow a word character or be followed by an asterisk or space
        begin: '\\B\\*(?![\\*\\s])',
        end: '(\\n{2}|\\*)',
        // allow escaped asterisk followed by word char
        contains: [
          {
            begin: '\\\\*\\w',
            relevance: 0
          }
        ]
      },
      // inline emphasis
      {
        className: 'emphasis',
        // must not follow a word character or be followed by a single quote or space
        begin: '\\B\'(?![\'\\s])',
        end: '(\\n{2}|\')',
        // allow escaped single quote followed by word char
        contains: [
          {
            begin: '\\\\\'\\w',
            relevance: 0
          }
        ],
        relevance: 0
      },
      // inline emphasis (alt)
      {
        className: 'emphasis',
        // must not follow a word character or be followed by an underline or space
        begin: '_(?![_\\s])',
        end: '(\\n{2}|_)',
        relevance: 0
      },
      // inline smart quotes
      {
        className: 'smartquote',
        variants: [
          {begin: "``.+?''"},
          {begin: "`.+?'"}
        ]
      },
      // inline code snippets (TODO should get same treatment as strong and emphasis)
      {
        className: 'code',
        begin: '(`.+?`|\\+.+?\\+)',
        relevance: 0
      },
      // indented literal block
      {
        className: 'code',
        begin: '^[ \\t]',
        end: '$',
        relevance: 0
      },
      // horizontal rules
      {
        className: 'horizontal_rule',
        begin: '^\'{3,}[ \\t]*$',
        relevance: 10
      },
      // images and links
      {
        begin: '(link:)?(http|https|ftp|file|irc|image:?):\\S+\\[.*?\\]',
        returnBegin: true,
        contains: [
          {
            //className: 'macro',
            begin: '(link|image:?):',
            relevance: 0
          },
          {
            className: 'link_url',
            begin: '\\w',
            end: '[^\\[]+',
            relevance: 0
          },
          {
            className: 'link_label',
            begin: '\\[',
            end: '\\]',
            excludeBegin: true,
            excludeEnd: true,
            relevance: 0
          }
        ],
        relevance: 10
      }
    ]
  };
};
},{}],22:[function(require,module,exports){
module.exports = function (hljs) {
  var KEYWORDS =
    'false synchronized int abstract float private char boolean static null if const ' +
    'for true while long throw strictfp finally protected import native final return void ' +
    'enum else extends implements break transient new catch instanceof byte super volatile case ' +
    'assert short package default double public try this switch continue throws privileged ' +
    'aspectOf adviceexecution proceed cflowbelow cflow initialization preinitialization ' +
    'staticinitialization withincode target within execution getWithinTypeName handler ' +
    'thisJoinPoint thisJoinPointStaticPart thisEnclosingJoinPointStaticPart declare parents '+
    'warning error soft precedence thisAspectInstance';
  var SHORTKEYS = 'get set args call';
  return {
    keywords : KEYWORDS,
    illegal : /<\//,
    contains : [
      hljs.COMMENT(
        '/\\*\\*',
        '\\*/',
        {
          relevance : 0,
          contains : [{
            className : 'doctag',
            begin : '@[A-Za-z]+'
          }]
        }
      ),
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE,
      {
        className : 'aspect',
        beginKeywords : 'aspect',
        end : /[{;=]/,
        excludeEnd : true,
        illegal : /[:;"\[\]]/,
        contains : [
          {
            beginKeywords : 'extends implements pertypewithin perthis pertarget percflowbelow percflow issingleton'
          },
          hljs.UNDERSCORE_TITLE_MODE,
          {
            begin : /\([^\)]*/,
            end : /[)]+/,
            keywords : KEYWORDS + ' ' + SHORTKEYS,
            excludeEnd : false
          }
        ]
      },
      {
        className : 'class',
        beginKeywords : 'class interface',
        end : /[{;=]/,
        excludeEnd : true,
        relevance: 0,
        keywords : 'class interface',
        illegal : /[:"\[\]]/,
        contains : [
          {beginKeywords : 'extends implements'},
          hljs.UNDERSCORE_TITLE_MODE
        ]
      },
      {
        // AspectJ Constructs
        beginKeywords : 'pointcut after before around throwing returning',
        end : /[)]/,
        excludeEnd : false,
        illegal : /["\[\]]/,
        contains : [
          {
            begin : hljs.UNDERSCORE_IDENT_RE + '\\s*\\(',
            returnBegin : true,
            contains : [hljs.UNDERSCORE_TITLE_MODE]
          }
        ]
      },
      {
        begin : /[:]/,
        returnBegin : true,
        end : /[{;]/,
        relevance: 0,
        excludeEnd : false,
        keywords : KEYWORDS,
        illegal : /["\[\]]/,
        contains : [
          {
            begin : hljs.UNDERSCORE_IDENT_RE + '\\s*\\(',
            keywords : KEYWORDS + ' ' + SHORTKEYS
          },
          hljs.QUOTE_STRING_MODE
        ]
      },
      {
        // this prevents 'new Name(...), or throw ...' from being recognized as a function definition
        beginKeywords : 'new throw',
        relevance : 0
      },
      {
        // the function class is a bit different for AspectJ compared to the Java language
        className : 'function',
        begin : /\w+ +\w+(\.)?\w+\s*\([^\)]*\)\s*((throws)[\w\s,]+)?[\{;]/,
        returnBegin : true,
        end : /[{;=]/,
        keywords : KEYWORDS,
        excludeEnd : true,
        contains : [
          {
            begin : hljs.UNDERSCORE_IDENT_RE + '\\s*\\(',
            returnBegin : true,
            relevance: 0,
            contains : [hljs.UNDERSCORE_TITLE_MODE]
          },
          {
            className : 'params',
            begin : /\(/, end : /\)/,
            relevance: 0,
            keywords : KEYWORDS,
            contains : [
              hljs.APOS_STRING_MODE,
              hljs.QUOTE_STRING_MODE,
              hljs.C_NUMBER_MODE,
              hljs.C_BLOCK_COMMENT_MODE
            ]
          },
          hljs.C_LINE_COMMENT_MODE,
          hljs.C_BLOCK_COMMENT_MODE
        ]
      },
      hljs.C_NUMBER_MODE,
      {
        // annotation is also used in this language
        className : 'annotation',
        begin : '@[A-Za-z]+'
      }
    ]
  };
};
},{}],23:[function(require,module,exports){
module.exports = function(hljs) {
  var BACKTICK_ESCAPE = {
    className: 'escape',
    begin: '`[\\s\\S]'
  };
  var COMMENTS = hljs.COMMENT(
    ';',
    '$',
    {
      relevance: 0
    }
  );
  var BUILT_IN = [
    {
      className: 'built_in',
      begin: 'A_[a-zA-Z0-9]+'
    },
    {
      className: 'built_in',
      beginKeywords: 'ComSpec Clipboard ClipboardAll ErrorLevel'
    }
  ];

  return {
    case_insensitive: true,
    keywords: {
      keyword: 'Break Continue Else Gosub If Loop Return While',
      literal: 'A true false NOT AND OR'
    },
    contains: BUILT_IN.concat([
      BACKTICK_ESCAPE,
      hljs.inherit(hljs.QUOTE_STRING_MODE, {contains: [BACKTICK_ESCAPE]}),
      COMMENTS,
      {
        className: 'number',
        begin: hljs.NUMBER_RE,
        relevance: 0
      },
      {
        className: 'var_expand', // FIXME
        begin: '%', end: '%',
        illegal: '\\n',
        contains: [BACKTICK_ESCAPE]
      },
      {
        className: 'label',
        contains: [BACKTICK_ESCAPE],
        variants: [
          {begin: '^[^\\n";]+::(?!=)'},
          {begin: '^[^\\n";]+:(?!=)', relevance: 0} // zero relevance as it catches a lot of things
                                                    // followed by a single ':' in many languages
        ]
      },
      {
        // consecutive commas, not for highlighting but just for relevance
        begin: ',\\s*,',
        relevance: 10
      }
    ])
  }
};
},{}],24:[function(require,module,exports){
module.exports = function(hljs) {
  return {
    case_insensitive: true,
    lexemes: '\\.?' + hljs.IDENT_RE,
    keywords: {
      keyword:
        /* mnemonic */
        'adc add adiw and andi asr bclr bld brbc brbs brcc brcs break breq brge brhc brhs ' +
        'brid brie brlo brlt brmi brne brpl brsh brtc brts brvc brvs bset bst call cbi cbr ' +
        'clc clh cli cln clr cls clt clv clz com cp cpc cpi cpse dec eicall eijmp elpm eor ' +
        'fmul fmuls fmulsu icall ijmp in inc jmp ld ldd ldi lds lpm lsl lsr mov movw mul ' +
        'muls mulsu neg nop or ori out pop push rcall ret reti rjmp rol ror sbc sbr sbrc sbrs ' +
        'sec seh sbi sbci sbic sbis sbiw sei sen ser ses set sev sez sleep spm st std sts sub ' +
        'subi swap tst wdr',
      built_in:
        /* general purpose registers */
        'r0 r1 r2 r3 r4 r5 r6 r7 r8 r9 r10 r11 r12 r13 r14 r15 r16 r17 r18 r19 r20 r21 r22 ' +
        'r23 r24 r25 r26 r27 r28 r29 r30 r31 x|0 xh xl y|0 yh yl z|0 zh zl ' +
        /* IO Registers (ATMega128) */
        'ucsr1c udr1 ucsr1a ucsr1b ubrr1l ubrr1h ucsr0c ubrr0h tccr3c tccr3a tccr3b tcnt3h ' +
        'tcnt3l ocr3ah ocr3al ocr3bh ocr3bl ocr3ch ocr3cl icr3h icr3l etimsk etifr tccr1c ' +
        'ocr1ch ocr1cl twcr twdr twar twsr twbr osccal xmcra xmcrb eicra spmcsr spmcr portg ' +
        'ddrg ping portf ddrf sreg sph spl xdiv rampz eicrb eimsk gimsk gicr eifr gifr timsk ' +
        'tifr mcucr mcucsr tccr0 tcnt0 ocr0 assr tccr1a tccr1b tcnt1h tcnt1l ocr1ah ocr1al ' +
        'ocr1bh ocr1bl icr1h icr1l tccr2 tcnt2 ocr2 ocdr wdtcr sfior eearh eearl eedr eecr ' +
        'porta ddra pina portb ddrb pinb portc ddrc pinc portd ddrd pind spdr spsr spcr udr0 ' +
        'ucsr0a ucsr0b ubrr0l acsr admux adcsr adch adcl porte ddre pine pinf',
      preprocessor:
        '.byte .cseg .db .def .device .dseg .dw .endmacro .equ .eseg .exit .include .list ' +
        '.listmac .macro .nolist .org .set'
    },
    contains: [
      hljs.C_BLOCK_COMMENT_MODE,
      hljs.COMMENT(
        ';',
        '$',
        {
          relevance: 0
        }
      ),
      hljs.C_NUMBER_MODE, // 0x..., decimal, float
      hljs.BINARY_NUMBER_MODE, // 0b...
      {
        className: 'number',
        begin: '\\b(\\$[a-zA-Z0-9]+|0o[0-7]+)' // $..., 0o...
      },
      hljs.QUOTE_STRING_MODE,
      {
        className: 'string',
        begin: '\'', end: '[^\\\\]\'',
        illegal: '[^\\\\][^\']'
      },
      {className: 'label',  begin: '^[A-Za-z0-9_.$]+:'},
      {className: 'preprocessor', begin: '#', end: '$'},
      {  // подстановка в «.macro»
        className: 'localvars',
        begin: '@[0-9]+'
      }
    ]
  };
};
},{}],25:[function(require,module,exports){
module.exports = function(hljs) {
  return {
    keywords: 'false int abstract private char boolean static null if for true ' +
      'while long throw finally protected final return void enum else ' +
      'break new catch byte super case short default double public try this switch ' +
      'continue reverse firstfast firstonly forupdate nofetch sum avg minof maxof count ' +
      'order group by asc desc index hint like dispaly edit client server ttsbegin ' +
      'ttscommit str real date container anytype common div mod',
    contains: [
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE,
      hljs.C_NUMBER_MODE,
      {
        className: 'preprocessor',
        begin: '#', end: '$'
      },
      {
        className: 'class',
        beginKeywords: 'class interface', end: '{', excludeEnd: true,
        illegal: ':',
        contains: [
          {beginKeywords: 'extends implements'},
          hljs.UNDERSCORE_TITLE_MODE
        ]
      }
    ]
  };
};
},{}],26:[function(require,module,exports){
module.exports = function(hljs) {
  var VAR = {
    className: 'variable',
    variants: [
      {begin: /\$[\w\d#@][\w\d_]*/},
      {begin: /\$\{(.*?)}/}
    ]
  };
  var QUOTE_STRING = {
    className: 'string',
    begin: /"/, end: /"/,
    contains: [
      hljs.BACKSLASH_ESCAPE,
      VAR,
      {
        className: 'variable',
        begin: /\$\(/, end: /\)/,
        contains: [hljs.BACKSLASH_ESCAPE]
      }
    ]
  };
  var APOS_STRING = {
    className: 'string',
    begin: /'/, end: /'/
  };

  return {
    aliases: ['sh', 'zsh'],
    lexemes: /-?[a-z\.]+/,
    keywords: {
      keyword:
        'if then else elif fi for while in do done case esac function',
      literal:
        'true false',
      built_in:
        // Shell built-ins
        // http://www.gnu.org/software/bash/manual/html_node/Shell-Builtin-Commands.html
        'break cd continue eval exec exit export getopts hash pwd readonly return shift test times ' +
        'trap umask unset ' +
        // Bash built-ins
        'alias bind builtin caller command declare echo enable help let local logout mapfile printf ' +
        'read readarray source type typeset ulimit unalias ' +
        // Shell modifiers
        'set shopt ' +
        // Zsh built-ins
        'autoload bg bindkey bye cap chdir clone comparguments compcall compctl compdescribe compfiles ' +
        'compgroups compquote comptags comptry compvalues dirs disable disown echotc echoti emulate ' +
        'fc fg float functions getcap getln history integer jobs kill limit log noglob popd print ' +
        'pushd pushln rehash sched setcap setopt stat suspend ttyctl unfunction unhash unlimit ' +
        'unsetopt vared wait whence where which zcompile zformat zftp zle zmodload zparseopts zprof ' +
        'zpty zregexparse zsocket zstyle ztcp',
      operator:
        '-ne -eq -lt -gt -f -d -e -s -l -a' // relevance booster
    },
    contains: [
      {
        className: 'shebang',
        begin: /^#![^\n]+sh\s*$/,
        relevance: 10
      },
      {
        className: 'function',
        begin: /\w[\w\d_]*\s*\(\s*\)\s*\{/,
        returnBegin: true,
        contains: [hljs.inherit(hljs.TITLE_MODE, {begin: /\w[\w\d_]*/})],
        relevance: 0
      },
      hljs.HASH_COMMENT_MODE,
      hljs.NUMBER_MODE,
      QUOTE_STRING,
      APOS_STRING,
      VAR
    ]
  };
};
},{}],27:[function(require,module,exports){
module.exports = function(hljs){
  var LITERAL = {
    className: 'literal',
    begin: '[\\+\\-]',
    relevance: 0
  };
  return {
    aliases: ['bf'],
    contains: [
      hljs.COMMENT(
        '[^\\[\\]\\.,\\+\\-<> \r\n]',
        '[\\[\\]\\.,\\+\\-<> \r\n]',
        {
          returnEnd: true,
          relevance: 0
        }
      ),
      {
        className: 'title',
        begin: '[\\[\\]]',
        relevance: 0
      },
      {
        className: 'string',
        begin: '[\\.,]',
        relevance: 0
      },
      {
        // this mode works as the only relevance counter
        begin: /\+\+|\-\-/, returnBegin: true,
        contains: [LITERAL]
      },
      LITERAL
    ]
  };
};
},{}],28:[function(require,module,exports){
module.exports = function(hljs) {
  var KEYWORDS =
    'div mod in and or not xor asserterror begin case do downto else end exit for if of repeat then to ' +
    'until while with var';
  var LITERALS = 'false true';
  var COMMENT_MODES = [
    hljs.C_LINE_COMMENT_MODE,
    hljs.COMMENT(
      /\{/,
      /\}/,
      {
        relevance: 0
      }
    ),
    hljs.COMMENT(
      /\(\*/,
      /\*\)/,
      {
        relevance: 10
      }
    )
  ];
  var STRING = {
    className: 'string',
    begin: /'/, end: /'/,
    contains: [{begin: /''/}]
  };
  var CHAR_STRING = {
    className: 'string', begin: /(#\d+)+/
  };
  var DATE = {
      className: 'date',
      begin: '\\b\\d+(\\.\\d+)?(DT|D|T)',
      relevance: 0
  };
  var DBL_QUOTED_VARIABLE = {
      className: 'variable',
      begin: '"',
      end: '"'
  };

  var PROCEDURE = {
    className: 'function',
    beginKeywords: 'procedure', end: /[:;]/,
    keywords: 'procedure|10',
    contains: [
      hljs.TITLE_MODE,
      {
        className: 'params',
        begin: /\(/, end: /\)/,
        keywords: KEYWORDS,
        contains: [STRING, CHAR_STRING]
      }
    ].concat(COMMENT_MODES)
  };

  var OBJECT = {
    className: 'class',
    begin: 'OBJECT (Table|Form|Report|Dataport|Codeunit|XMLport|MenuSuite|Page|Query) (\\d+) ([^\\r\\n]+)',
    returnBegin: true,
    contains: [
      hljs.TITLE_MODE,
        PROCEDURE
    ]
  };
    
  return {
    case_insensitive: true,
    keywords: { keyword: KEYWORDS, literal: LITERALS },
    contains: [
      STRING, CHAR_STRING,
      DATE, DBL_QUOTED_VARIABLE,
      hljs.NUMBER_MODE,
      OBJECT,
      PROCEDURE
    ]
  };
};
},{}],29:[function(require,module,exports){
module.exports = function(hljs) {
  return {
    aliases: ['capnp'],
    keywords: {
      keyword:
        'struct enum interface union group import using const annotation extends in of on as with from fixed',
      built_in:
        'Void Bool Int8 Int16 Int32 Int64 UInt8 UInt16 UInt32 UInt64 Float32 Float64 ' +
        'Text Data AnyPointer AnyStruct Capability List',
      literal:
        'true false'
    },
    contains: [
      hljs.QUOTE_STRING_MODE,
      hljs.NUMBER_MODE,
      hljs.HASH_COMMENT_MODE,
      {
        className: 'shebang',
        begin: /@0x[\w\d]{16};/,
        illegal: /\n/
      },
      {
        className: 'number',
        begin: /@\d+\b/
      },
      {
        className: 'class',
        beginKeywords: 'struct enum', end: /\{/,
        illegal: /\n/,
        contains: [
          hljs.inherit(hljs.TITLE_MODE, {
            starts: {endsWithParent: true, excludeEnd: true} // hack: eating everything after the first title
          })
        ]
      },
      {
        className: 'class',
        beginKeywords: 'interface', end: /\{/,
        illegal: /\n/,
        contains: [
          hljs.inherit(hljs.TITLE_MODE, {
            starts: {endsWithParent: true, excludeEnd: true} // hack: eating everything after the first title
          })
        ]
      }
    ]
  };
};
},{}],30:[function(require,module,exports){
module.exports = function(hljs) {
  // 2.3. Identifiers and keywords
  var KEYWORDS =
    'assembly module package import alias class interface object given value ' +
    'assign void function new of extends satisfies abstracts in out return ' +
    'break continue throw assert dynamic if else switch case for while try ' +
    'catch finally then let this outer super is exists nonempty';
  // 7.4.1 Declaration Modifiers
  var DECLARATION_MODIFIERS =
    'shared abstract formal default actual variable late native deprecated' +
    'final sealed annotation suppressWarnings small';
  // 7.4.2 Documentation
  var DOCUMENTATION =
    'doc by license see throws tagged';
  var LANGUAGE_ANNOTATIONS = DECLARATION_MODIFIERS + ' ' + DOCUMENTATION;
  var SUBST = {
    className: 'subst', excludeBegin: true, excludeEnd: true,
    begin: /``/, end: /``/,
    keywords: KEYWORDS,
    relevance: 10
  };
  var EXPRESSIONS = [
    {
      // verbatim string
      className: 'string',
      begin: '"""',
      end: '"""',
      relevance: 10
    },
    {
      // string literal or template
      className: 'string',
      begin: '"', end: '"',
      contains: [SUBST]
    },
    {
      // character literal
      className: 'string',
      begin: "'",
      end: "'",
    },
    {
      // numeric literal
      className: 'number',
      begin: '#[0-9a-fA-F_]+|\\$[01_]+|[0-9_]+(?:\\.[0-9_](?:[eE][+-]?\\d+)?)?[kMGTPmunpf]?',
      relevance: 0
    }
  ];
  SUBST.contains = EXPRESSIONS;

  return {
    keywords: {
      keyword: KEYWORDS,
      annotation: LANGUAGE_ANNOTATIONS
    },
    illegal: '\\$[^01]|#[^0-9a-fA-F]',
    contains: [
      hljs.C_LINE_COMMENT_MODE,
      hljs.COMMENT('/\\*', '\\*/', {contains: ['self']}),
      {
        // compiler annotation
        className: 'annotation',
        begin: '@[a-z]\\w*(?:\\:\"[^\"]*\")?'
      }
    ].concat(EXPRESSIONS)
  };
};
},{}],31:[function(require,module,exports){
module.exports = function(hljs) {
  return {
    contains: [
      {
        className: 'prompt',
        begin: /^([\w.-]+|\s*#_)=>/,
        starts: {
          end: /$/,
          subLanguage: 'clojure', subLanguageMode: 'continuous'
        }
      }
    ]
  }
};
},{}],32:[function(require,module,exports){
module.exports = function(hljs) {
  var keywords = {
    built_in:
      // Clojure keywords
      'def cond apply if-not if-let if not not= = < > <= >= == + / * - rem '+
      'quot neg? pos? delay? symbol? keyword? true? false? integer? empty? coll? list? '+
      'set? ifn? fn? associative? sequential? sorted? counted? reversible? number? decimal? '+
      'class? distinct? isa? float? rational? reduced? ratio? odd? even? char? seq? vector? '+
      'string? map? nil? contains? zero? instance? not-every? not-any? libspec? -> ->> .. . '+
      'inc compare do dotimes mapcat take remove take-while drop letfn drop-last take-last '+
      'drop-while while intern condp case reduced cycle split-at split-with repeat replicate '+
      'iterate range merge zipmap declare line-seq sort comparator sort-by dorun doall nthnext '+
      'nthrest partition eval doseq await await-for let agent atom send send-off release-pending-sends '+
      'add-watch mapv filterv remove-watch agent-error restart-agent set-error-handler error-handler '+
      'set-error-mode! error-mode shutdown-agents quote var fn loop recur throw try monitor-enter '+
      'monitor-exit defmacro defn defn- macroexpand macroexpand-1 for dosync and or '+
      'when when-not when-let comp juxt partial sequence memoize constantly complement identity assert '+
      'peek pop doto proxy defstruct first rest cons defprotocol cast coll deftype defrecord last butlast '+
      'sigs reify second ffirst fnext nfirst nnext defmulti defmethod meta with-meta ns in-ns create-ns import '+
      'refer keys select-keys vals key val rseq name namespace promise into transient persistent! conj! '+
      'assoc! dissoc! pop! disj! use class type num float double short byte boolean bigint biginteger '+
      'bigdec print-method print-dup throw-if printf format load compile get-in update-in pr pr-on newline '+
      'flush read slurp read-line subvec with-open memfn time re-find re-groups rand-int rand mod locking '+
      'assert-valid-fdecl alias resolve ref deref refset swap! reset! set-validator! compare-and-set! alter-meta! '+
      'reset-meta! commute get-validator alter ref-set ref-history-count ref-min-history ref-max-history ensure sync io! '+
      'new next conj set! to-array future future-call into-array aset gen-class reduce map filter find empty '+
      'hash-map hash-set sorted-map sorted-map-by sorted-set sorted-set-by vec vector seq flatten reverse assoc dissoc list '+
      'disj get union difference intersection extend extend-type extend-protocol int nth delay count concat chunk chunk-buffer '+
      'chunk-append chunk-first chunk-rest max min dec unchecked-inc-int unchecked-inc unchecked-dec-inc unchecked-dec unchecked-negate '+
      'unchecked-add-int unchecked-add unchecked-subtract-int unchecked-subtract chunk-next chunk-cons chunked-seq? prn vary-meta '+
      'lazy-seq spread list* str find-keyword keyword symbol gensym force rationalize'
   };

  var SYMBOLSTART = 'a-zA-Z_\\-!.?+*=<>&#\'';
  var SYMBOL_RE = '[' + SYMBOLSTART + '][' + SYMBOLSTART + '0-9/;:]*';
  var SIMPLE_NUMBER_RE = '[-+]?\\d+(\\.\\d+)?';

  var SYMBOL = {
    begin: SYMBOL_RE,
    relevance: 0
  };
  var NUMBER = {
    className: 'number', begin: SIMPLE_NUMBER_RE,
    relevance: 0
  };
  var STRING = hljs.inherit(hljs.QUOTE_STRING_MODE, {illegal: null});
  var COMMENT = hljs.COMMENT(
    ';',
    '$',
    {
      relevance: 0
    }
  );
  var LITERAL = {
    className: 'literal',
    begin: /\b(true|false|nil)\b/
  };
  var COLLECTION = {
    className: 'collection',
    begin: '[\\[\\{]', end: '[\\]\\}]'
  };
  var HINT = {
    className: 'comment',
    begin: '\\^' + SYMBOL_RE
  };
  var HINT_COL = hljs.COMMENT('\\^\\{', '\\}');
  var KEY = {
    className: 'attribute',
    begin: '[:]' + SYMBOL_RE
  };
  var LIST = {
    className: 'list',
    begin: '\\(', end: '\\)'
  };
  var BODY = {
    endsWithParent: true,
    relevance: 0
  };
  var NAME = {
    keywords: keywords,
    lexemes: SYMBOL_RE,
    className: 'keyword', begin: SYMBOL_RE,
    starts: BODY
  };
  var DEFAULT_CONTAINS = [LIST, STRING, HINT, HINT_COL, COMMENT, KEY, COLLECTION, NUMBER, LITERAL, SYMBOL];

  LIST.contains = [hljs.COMMENT('comment', ''), NAME, BODY];
  BODY.contains = DEFAULT_CONTAINS;
  COLLECTION.contains = DEFAULT_CONTAINS;

  return {
    aliases: ['clj'],
    illegal: /\S/,
    contains: [LIST, STRING, HINT, HINT_COL, COMMENT, KEY, COLLECTION, NUMBER, LITERAL]
  }
};
},{}],33:[function(require,module,exports){
module.exports = function(hljs) {
  return {
    aliases: ['cmake.in'],
    case_insensitive: true,
    keywords: {
      keyword:
        'add_custom_command add_custom_target add_definitions add_dependencies ' +
        'add_executable add_library add_subdirectory add_test aux_source_directory ' +
        'break build_command cmake_minimum_required cmake_policy configure_file ' +
        'create_test_sourcelist define_property else elseif enable_language enable_testing ' +
        'endforeach endfunction endif endmacro endwhile execute_process export find_file ' +
        'find_library find_package find_path find_program fltk_wrap_ui foreach function ' +
        'get_cmake_property get_directory_property get_filename_component get_property ' +
        'get_source_file_property get_target_property get_test_property if include ' +
        'include_directories include_external_msproject include_regular_expression install ' +
        'link_directories load_cache load_command macro mark_as_advanced message option ' +
        'output_required_files project qt_wrap_cpp qt_wrap_ui remove_definitions return ' +
        'separate_arguments set set_directory_properties set_property ' +
        'set_source_files_properties set_target_properties set_tests_properties site_name ' +
        'source_group string target_link_libraries try_compile try_run unset variable_watch ' +
        'while build_name exec_program export_library_dependencies install_files ' +
        'install_programs install_targets link_libraries make_directory remove subdir_depends ' +
        'subdirs use_mangled_mesa utility_source variable_requires write_file ' +
        'qt5_use_modules qt5_use_package qt5_wrap_cpp on off true false and or',
      operator:
        'equal less greater strless strgreater strequal matches'
    },
    contains: [
      {
        className: 'envvar',
        begin: '\\${', end: '}'
      },
      hljs.HASH_COMMENT_MODE,
      hljs.QUOTE_STRING_MODE,
      hljs.NUMBER_MODE
    ]
  };
};
},{}],34:[function(require,module,exports){
module.exports = function(hljs) {
  var KEYWORDS = {
    keyword:
      // JS keywords
      'in if for while finally new do return else break catch instanceof throw try this ' +
      'switch continue typeof delete debugger super ' +
      // Coffee keywords
      'then unless until loop of by when and or is isnt not',
    literal:
      // JS literals
      'true false null undefined ' +
      // Coffee literals
      'yes no on off',
    reserved:
      'case default function var void with const let enum export import native ' +
      '__hasProp __extends __slice __bind __indexOf',
    built_in:
      'npm require console print module global window document'
  };
  var JS_IDENT_RE = '[A-Za-z$_][0-9A-Za-z$_]*';
  var SUBST = {
    className: 'subst',
    begin: /#\{/, end: /}/,
    keywords: KEYWORDS
  };
  var EXPRESSIONS = [
    hljs.BINARY_NUMBER_MODE,
    hljs.inherit(hljs.C_NUMBER_MODE, {starts: {end: '(\\s*/)?', relevance: 0}}), // a number tries to eat the following slash to prevent treating it as a regexp
    {
      className: 'string',
      variants: [
        {
          begin: /'''/, end: /'''/,
          contains: [hljs.BACKSLASH_ESCAPE]
        },
        {
          begin: /'/, end: /'/,
          contains: [hljs.BACKSLASH_ESCAPE]
        },
        {
          begin: /"""/, end: /"""/,
          contains: [hljs.BACKSLASH_ESCAPE, SUBST]
        },
        {
          begin: /"/, end: /"/,
          contains: [hljs.BACKSLASH_ESCAPE, SUBST]
        }
      ]
    },
    {
      className: 'regexp',
      variants: [
        {
          begin: '///', end: '///',
          contains: [SUBST, hljs.HASH_COMMENT_MODE]
        },
        {
          begin: '//[gim]*',
          relevance: 0
        },
        {
          // regex can't start with space to parse x / 2 / 3 as two divisions
          // regex can't start with *, and it supports an "illegal" in the main mode
          begin: /\/(?![ *])(\\\/|.)*?\/[gim]*(?=\W|$)/
        }
      ]
    },
    {
      className: 'property',
      begin: '@' + JS_IDENT_RE
    },
    {
      begin: '`', end: '`',
      excludeBegin: true, excludeEnd: true,
      subLanguage: 'javascript'
    }
  ];
  SUBST.contains = EXPRESSIONS;

  var TITLE = hljs.inherit(hljs.TITLE_MODE, {begin: JS_IDENT_RE});
  var PARAMS_RE = '(\\(.*\\))?\\s*\\B[-=]>';
  var PARAMS = {
    className: 'params',
    begin: '\\([^\\(]', returnBegin: true,
    /* We need another contained nameless mode to not have every nested
    pair of parens to be called "params" */
    contains: [{
      begin: /\(/, end: /\)/,
      keywords: KEYWORDS,
      contains: ['self'].concat(EXPRESSIONS)
    }]
  };

  return {
    aliases: ['coffee', 'cson', 'iced'],
    keywords: KEYWORDS,
    illegal: /\/\*/,
    contains: EXPRESSIONS.concat([
      hljs.COMMENT('###', '###'),
      hljs.HASH_COMMENT_MODE,
      {
        className: 'function',
        begin: '^\\s*' + JS_IDENT_RE + '\\s*=\\s*' + PARAMS_RE, end: '[-=]>',
        returnBegin: true,
        contains: [TITLE, PARAMS]
      },
      {
        // anonymous function start
        begin: /[:\(,=]\s*/,
        relevance: 0,
        contains: [
          {
            className: 'function',
            begin: PARAMS_RE, end: '[-=]>',
            returnBegin: true,
            contains: [PARAMS]
          }
        ]
      },
      {
        className: 'class',
        beginKeywords: 'class',
        end: '$',
        illegal: /[:="\[\]]/,
        contains: [
          {
            beginKeywords: 'extends',
            endsWithParent: true,
            illegal: /[:="\[\]]/,
            contains: [TITLE]
          },
          TITLE
        ]
      },
      {
        className: 'attribute',
        begin: JS_IDENT_RE + ':', end: ':',
        returnBegin: true, returnEnd: true,
        relevance: 0
      }
    ])
  };
};
},{}],35:[function(require,module,exports){
module.exports = function(hljs) {
  var CPP_PRIMATIVE_TYPES = {
    className: 'keyword',
    begin: '[a-z\\d_]*_t'
  };

  var CPP_KEYWORDS = {
    keyword: 'false int float while private char catch export virtual operator sizeof ' +
      'dynamic_cast|10 typedef const_cast|10 const struct for static_cast|10 union namespace ' +
      'unsigned long volatile static protected bool template mutable if public friend ' +
      'do goto auto void enum else break extern using true class asm case typeid ' +
      'short reinterpret_cast|10 default double register explicit signed typename try this ' +
      'switch continue inline delete alignof constexpr decltype ' +
      'noexcept nullptr static_assert thread_local restrict _Bool complex _Complex _Imaginary ' +
      'atomic_bool atomic_char atomic_schar ' +
      'atomic_uchar atomic_short atomic_ushort atomic_int atomic_uint atomic_long atomic_ulong atomic_llong ' +
      'atomic_ullong',
    built_in: 'std string cin cout cerr clog stringstream istringstream ostringstream ' +
      'auto_ptr deque list queue stack vector map set bitset multiset multimap unordered_set ' +
      'unordered_map unordered_multiset unordered_multimap array shared_ptr abort abs acos ' +
      'asin atan2 atan calloc ceil cosh cos exit exp fabs floor fmod fprintf fputs free frexp ' +
      'fscanf isalnum isalpha iscntrl isdigit isgraph islower isprint ispunct isspace isupper ' +
      'isxdigit tolower toupper labs ldexp log10 log malloc memchr memcmp memcpy memset modf pow ' +
      'printf putchar puts scanf sinh sin snprintf sprintf sqrt sscanf strcat strchr strcmp ' +
      'strcpy strcspn strlen strncat strncmp strncpy strpbrk strrchr strspn strstr tanh tan ' +
      'vfprintf vprintf vsprintf'
  };
  return {
    aliases: ['c', 'cc', 'h', 'c++', 'h++', 'hpp'],
    keywords: CPP_KEYWORDS,
    illegal: '</',
    contains: [
      CPP_PRIMATIVE_TYPES,
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      {
        className: 'string',
        variants: [
          hljs.inherit(hljs.QUOTE_STRING_MODE, { begin: '((u8?|U)|L)?"' }),
          {
            begin: '(u8?|U)?R"', end: '"',
            contains: [hljs.BACKSLASH_ESCAPE]
          },
          {
            begin: '\'\\\\?.', end: '\'',
            illegal: '.'
          }
        ]
      },
      {
        className: 'number',
        begin: '\\b(\\d+(\\.\\d*)?|\\.\\d+)(u|U|l|L|ul|UL|f|F)'
      },
      hljs.C_NUMBER_MODE,
      {
        className: 'preprocessor',
        begin: '#', end: '$',
        keywords: 'if else elif endif define undef warning error line pragma',
        contains: [
          {
            begin: /\\\n/, relevance: 0
          },
          {
            begin: 'include\\s*[<"]', end: '[>"]',
            keywords: 'include',
            illegal: '\\n'
          },
          hljs.C_LINE_COMMENT_MODE
        ]
      },
      {
        begin: '\\b(deque|list|queue|stack|vector|map|set|bitset|multiset|multimap|unordered_map|unordered_set|unordered_multiset|unordered_multimap|array)\\s*<', end: '>',
        keywords: CPP_KEYWORDS,
        contains: ['self', CPP_PRIMATIVE_TYPES]
      },
      {
        begin: hljs.IDENT_RE + '::',
        keywords: CPP_KEYWORDS
      },
      {
        // Expression keywords prevent 'keyword Name(...) or else if(...)' from
        // being recognized as a function definition
        beginKeywords: 'new throw return else',
        relevance: 0
      },
      {
        className: 'function',
        begin: '(' + hljs.IDENT_RE + '\\s+)+' + hljs.IDENT_RE + '\\s*\\(', returnBegin: true, end: /[{;=]/,
        excludeEnd: true,
        keywords: CPP_KEYWORDS,
        contains: [
          {
            begin: hljs.IDENT_RE + '\\s*\\(', returnBegin: true,
            contains: [hljs.TITLE_MODE],
            relevance: 0
          },
          {
            className: 'params',
            begin: /\(/, end: /\)/,
            keywords: CPP_KEYWORDS,
            relevance: 0,
            contains: [
              hljs.C_BLOCK_COMMENT_MODE
            ]
          },
          hljs.C_LINE_COMMENT_MODE,
          hljs.C_BLOCK_COMMENT_MODE
        ]
      }
    ]
  };
};
},{}],36:[function(require,module,exports){
module.exports = function(hljs) {
  var KEYWORDS =
    // Normal keywords.
    'abstract as base bool break byte case catch char checked const continue decimal dynamic ' +
    'default delegate do double else enum event explicit extern false finally fixed float ' +
    'for foreach goto if implicit in int interface internal is lock long null when ' +
    'object operator out override params private protected public readonly ref sbyte ' +
    'sealed short sizeof stackalloc static string struct switch this true try typeof ' +
    'uint ulong unchecked unsafe ushort using virtual volatile void while async ' +
    'protected public private internal ' +
    // Contextual keywords.
    'ascending descending from get group into join let orderby partial select set value var ' +
    'where yield';
  var GENERIC_IDENT_RE = hljs.IDENT_RE + '(<' + hljs.IDENT_RE + '>)?';
  return {
    aliases: ['csharp'],
    keywords: KEYWORDS,
    illegal: /::/,
    contains: [
      hljs.COMMENT(
        '///',
        '$',
        {
          returnBegin: true,
          contains: [
            {
              className: 'xmlDocTag',
              variants: [
                {
                  begin: '///', relevance: 0
                },
                {
                  begin: '<!--|-->'
                },
                {
                  begin: '</?', end: '>'
                }
              ]
            }
          ]
        }
      ),
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      {
        className: 'preprocessor',
        begin: '#', end: '$',
        keywords: 'if else elif endif define undef warning error line region endregion pragma checksum'
      },
      {
        className: 'string',
        begin: '@"', end: '"',
        contains: [{begin: '""'}]
      },
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE,
      hljs.C_NUMBER_MODE,
      {
        beginKeywords: 'class interface', end: /[{;=]/,
        illegal: /[^\s:]/,
        contains: [
          hljs.TITLE_MODE,
          hljs.C_LINE_COMMENT_MODE,
          hljs.C_BLOCK_COMMENT_MODE
        ]
      },
      {
        beginKeywords: 'namespace', end: /[{;=]/,
        illegal: /[^\s:]/,
        contains: [
          {
            // Customization of hljs.TITLE_MODE that allows '.'
            className: 'title',
            begin: '[a-zA-Z](\\.?\\w)*',
            relevance: 0
          },
          hljs.C_LINE_COMMENT_MODE,
          hljs.C_BLOCK_COMMENT_MODE
        ]
      },
      {
        // Expression keywords prevent 'keyword Name(...)' from being
        // recognized as a function definition
        beginKeywords: 'new return throw await',
        relevance: 0
      },
      {
        className: 'function',
        begin: '(' + GENERIC_IDENT_RE + '\\s+)+' + hljs.IDENT_RE + '\\s*\\(', returnBegin: true, end: /[{;=]/,
        excludeEnd: true,
        keywords: KEYWORDS,
        contains: [
          {
            begin: hljs.IDENT_RE + '\\s*\\(', returnBegin: true,
            contains: [hljs.TITLE_MODE],
            relevance: 0
          },
          {
            className: 'params',
            begin: /\(/, end: /\)/,
            excludeBegin: true,
            excludeEnd: true,
            keywords: KEYWORDS,
            relevance: 0,
            contains: [
              hljs.APOS_STRING_MODE,
              hljs.QUOTE_STRING_MODE,
              hljs.C_NUMBER_MODE,
              hljs.C_BLOCK_COMMENT_MODE
            ]
          },
          hljs.C_LINE_COMMENT_MODE,
          hljs.C_BLOCK_COMMENT_MODE
        ]
      }
    ]
  };
};
},{}],37:[function(require,module,exports){
module.exports = function(hljs) {
  var IDENT_RE = '[a-zA-Z-][a-zA-Z0-9_-]*';
  var FUNCTION = {
    className: 'function',
    begin: IDENT_RE + '\\(',
    returnBegin: true,
    excludeEnd: true,
    end: '\\('
  };
  var RULE = {
    className: 'rule',
    begin: /[A-Z\_\.\-]+\s*:/, returnBegin: true, end: ';', endsWithParent: true,
    contains: [
      {
        className: 'attribute',
        begin: /\S/, end: ':', excludeEnd: true,
        starts: {
          className: 'value',
          endsWithParent: true, excludeEnd: true,
          contains: [
            FUNCTION,
            hljs.CSS_NUMBER_MODE,
            hljs.QUOTE_STRING_MODE,
            hljs.APOS_STRING_MODE,
            hljs.C_BLOCK_COMMENT_MODE,
            {
              className: 'hexcolor', begin: '#[0-9A-Fa-f]+'
            },
            {
              className: 'important', begin: '!important'
            }
          ]
        }
      }
    ]
  };

  return {
    case_insensitive: true,
    illegal: /[=\/|'\$]/,
    contains: [
      hljs.C_BLOCK_COMMENT_MODE,
      RULE,
      {
        className: 'id', begin: /\#[A-Za-z0-9_-]+/
      },
      {
        className: 'class', begin: /\.[A-Za-z0-9_-]+/
      },
      {
        className: 'attr_selector',
        begin: /\[/, end: /\]/,
        illegal: '$'
      },
      {
        className: 'pseudo',
        begin: /:(:)?[a-zA-Z0-9\_\-\+\(\)"']+/
      },
      {
        className: 'at_rule',
        begin: '@(font-face|page)',
        lexemes: '[a-z-]+',
        keywords: 'font-face page'
      },
      {
        className: 'at_rule',
        begin: '@', end: '[{;]', // at_rule eating first "{" is a good thing
                                 // because it doesn’t let it to be parsed as
                                 // a rule set but instead drops parser into
                                 // the default mode which is how it should be.
        contains: [
          {
            className: 'keyword',
            begin: /\S+/
          },
          {
            begin: /\s/, endsWithParent: true, excludeEnd: true,
            relevance: 0,
            contains: [
              FUNCTION,
              hljs.APOS_STRING_MODE, hljs.QUOTE_STRING_MODE,
              hljs.CSS_NUMBER_MODE
            ]
          }
        ]
      },
      {
        className: 'tag', begin: IDENT_RE,
        relevance: 0
      },
      {
        className: 'rules',
        begin: '{', end: '}',
        illegal: /\S/,
        contains: [
          hljs.C_BLOCK_COMMENT_MODE,
          RULE,
        ]
      }
    ]
  };
};
},{}],38:[function(require,module,exports){
module.exports = /**
 * Known issues:
 *
 * - invalid hex string literals will be recognized as a double quoted strings
 *   but 'x' at the beginning of string will not be matched
 *
 * - delimited string literals are not checked for matching end delimiter
 *   (not possible to do with js regexp)
 *
 * - content of token string is colored as a string (i.e. no keyword coloring inside a token string)
 *   also, content of token string is not validated to contain only valid D tokens
 *
 * - special token sequence rule is not strictly following D grammar (anything following #line
 *   up to the end of line is matched as special token sequence)
 */

function(hljs) {
  /**
   * Language keywords
   *
   * @type {Object}
   */
  var D_KEYWORDS = {
    keyword:
      'abstract alias align asm assert auto body break byte case cast catch class ' +
      'const continue debug default delete deprecated do else enum export extern final ' +
      'finally for foreach foreach_reverse|10 goto if immutable import in inout int ' +
      'interface invariant is lazy macro mixin module new nothrow out override package ' +
      'pragma private protected public pure ref return scope shared static struct ' +
      'super switch synchronized template this throw try typedef typeid typeof union ' +
      'unittest version void volatile while with __FILE__ __LINE__ __gshared|10 ' +
      '__thread __traits __DATE__ __EOF__ __TIME__ __TIMESTAMP__ __VENDOR__ __VERSION__',
    built_in:
      'bool cdouble cent cfloat char creal dchar delegate double dstring float function ' +
      'idouble ifloat ireal long real short string ubyte ucent uint ulong ushort wchar ' +
      'wstring',
    literal:
      'false null true'
  };

  /**
   * Number literal regexps
   *
   * @type {String}
   */
  var decimal_integer_re = '(0|[1-9][\\d_]*)',
    decimal_integer_nosus_re = '(0|[1-9][\\d_]*|\\d[\\d_]*|[\\d_]+?\\d)',
    binary_integer_re = '0[bB][01_]+',
    hexadecimal_digits_re = '([\\da-fA-F][\\da-fA-F_]*|_[\\da-fA-F][\\da-fA-F_]*)',
    hexadecimal_integer_re = '0[xX]' + hexadecimal_digits_re,

    decimal_exponent_re = '([eE][+-]?' + decimal_integer_nosus_re + ')',
    decimal_float_re = '(' + decimal_integer_nosus_re + '(\\.\\d*|' + decimal_exponent_re + ')|' +
                '\\d+\\.' + decimal_integer_nosus_re + decimal_integer_nosus_re + '|' +
                '\\.' + decimal_integer_re + decimal_exponent_re + '?' +
              ')',
    hexadecimal_float_re = '(0[xX](' +
                  hexadecimal_digits_re + '\\.' + hexadecimal_digits_re + '|'+
                  '\\.?' + hexadecimal_digits_re +
                 ')[pP][+-]?' + decimal_integer_nosus_re + ')',

    integer_re = '(' +
      decimal_integer_re + '|' +
      binary_integer_re  + '|' +
       hexadecimal_integer_re   +
    ')',

    float_re = '(' +
      hexadecimal_float_re + '|' +
      decimal_float_re  +
    ')';

  /**
   * Escape sequence supported in D string and character literals
   *
   * @type {String}
   */
  var escape_sequence_re = '\\\\(' +
              '[\'"\\?\\\\abfnrtv]|' +  // common escapes
              'u[\\dA-Fa-f]{4}|' +     // four hex digit unicode codepoint
              '[0-7]{1,3}|' +       // one to three octal digit ascii char code
              'x[\\dA-Fa-f]{2}|' +    // two hex digit ascii char code
              'U[\\dA-Fa-f]{8}' +      // eight hex digit unicode codepoint
              ')|' +
              '&[a-zA-Z\\d]{2,};';      // named character entity

  /**
   * D integer number literals
   *
   * @type {Object}
   */
  var D_INTEGER_MODE = {
    className: 'number',
      begin: '\\b' + integer_re + '(L|u|U|Lu|LU|uL|UL)?',
      relevance: 0
  };

  /**
   * [D_FLOAT_MODE description]
   * @type {Object}
   */
  var D_FLOAT_MODE = {
    className: 'number',
    begin: '\\b(' +
        float_re + '([fF]|L|i|[fF]i|Li)?|' +
        integer_re + '(i|[fF]i|Li)' +
      ')',
    relevance: 0
  };

  /**
   * D character literal
   *
   * @type {Object}
   */
  var D_CHARACTER_MODE = {
    className: 'string',
    begin: '\'(' + escape_sequence_re + '|.)', end: '\'',
    illegal: '.'
  };

  /**
   * D string escape sequence
   *
   * @type {Object}
   */
  var D_ESCAPE_SEQUENCE = {
    begin: escape_sequence_re,
    relevance: 0
  };

  /**
   * D double quoted string literal
   *
   * @type {Object}
   */
  var D_STRING_MODE = {
    className: 'string',
    begin: '"',
    contains: [D_ESCAPE_SEQUENCE],
    end: '"[cwd]?'
  };

  /**
   * D wysiwyg and delimited string literals
   *
   * @type {Object}
   */
  var D_WYSIWYG_DELIMITED_STRING_MODE = {
    className: 'string',
    begin: '[rq]"',
    end: '"[cwd]?',
    relevance: 5
  };

  /**
   * D alternate wysiwyg string literal
   *
   * @type {Object}
   */
  var D_ALTERNATE_WYSIWYG_STRING_MODE = {
    className: 'string',
    begin: '`',
    end: '`[cwd]?'
  };

  /**
   * D hexadecimal string literal
   *
   * @type {Object}
   */
  var D_HEX_STRING_MODE = {
    className: 'string',
    begin: 'x"[\\da-fA-F\\s\\n\\r]*"[cwd]?',
    relevance: 10
  };

  /**
   * D delimited string literal
   *
   * @type {Object}
   */
  var D_TOKEN_STRING_MODE = {
    className: 'string',
    begin: 'q"\\{',
    end: '\\}"'
  };

  /**
   * Hashbang support
   *
   * @type {Object}
   */
  var D_HASHBANG_MODE = {
    className: 'shebang',
    begin: '^#!',
    end: '$',
    relevance: 5
  };

  /**
   * D special token sequence
   *
   * @type {Object}
   */
  var D_SPECIAL_TOKEN_SEQUENCE_MODE = {
    className: 'preprocessor',
    begin: '#(line)',
    end: '$',
    relevance: 5
  };

  /**
   * D attributes
   *
   * @type {Object}
   */
  var D_ATTRIBUTE_MODE = {
    className: 'keyword',
    begin: '@[a-zA-Z_][a-zA-Z_\\d]*'
  };

  /**
   * D nesting comment
   *
   * @type {Object}
   */
  var D_NESTING_COMMENT_MODE = hljs.COMMENT(
    '\\/\\+',
    '\\+\\/',
    {
      contains: ['self'],
      relevance: 10
    }
  );

  return {
    lexemes: hljs.UNDERSCORE_IDENT_RE,
    keywords: D_KEYWORDS,
    contains: [
      hljs.C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        D_NESTING_COMMENT_MODE,
        D_HEX_STRING_MODE,
        D_STRING_MODE,
        D_WYSIWYG_DELIMITED_STRING_MODE,
        D_ALTERNATE_WYSIWYG_STRING_MODE,
        D_TOKEN_STRING_MODE,
        D_FLOAT_MODE,
        D_INTEGER_MODE,
        D_CHARACTER_MODE,
        D_HASHBANG_MODE,
        D_SPECIAL_TOKEN_SEQUENCE_MODE,
        D_ATTRIBUTE_MODE
    ]
  };
};
},{}],39:[function(require,module,exports){
module.exports = function (hljs) {
  var SUBST = {
    className: 'subst',
    begin: '\\$\\{', end: '}',
    keywords: 'true false null this is new super'
  };

  var STRING = {
    className: 'string',
    variants: [
      {
        begin: 'r\'\'\'', end: '\'\'\''
      },
      {
        begin: 'r"""', end: '"""'
      },
      {
        begin: 'r\'', end: '\'',
        illegal: '\\n'
      },
      {
        begin: 'r"', end: '"',
        illegal: '\\n'
      },
      {
        begin: '\'\'\'', end: '\'\'\'',
        contains: [hljs.BACKSLASH_ESCAPE, SUBST]
      },
      {
        begin: '"""', end: '"""',
        contains: [hljs.BACKSLASH_ESCAPE, SUBST]
      },
      {
        begin: '\'', end: '\'',
        illegal: '\\n',
        contains: [hljs.BACKSLASH_ESCAPE, SUBST]
      },
      {
        begin: '"', end: '"',
        illegal: '\\n',
        contains: [hljs.BACKSLASH_ESCAPE, SUBST]
      }
    ]
  };
  SUBST.contains = [
    hljs.C_NUMBER_MODE, STRING
  ];

  var KEYWORDS = {
    keyword: 'assert break case catch class const continue default do else enum extends false final finally for if ' +
      'in is new null rethrow return super switch this throw true try var void while with',
    literal: 'abstract as dynamic export external factory get implements import library operator part set static typedef',
    built_in:
      // dart:core
      'print Comparable DateTime Duration Function Iterable Iterator List Map Match Null Object Pattern RegExp Set ' +
      'Stopwatch String StringBuffer StringSink Symbol Type Uri bool double int num ' +
      // dart:html
      'document window querySelector querySelectorAll Element ElementList'
  };

  return {
    keywords: KEYWORDS,
    contains: [
      STRING,
      hljs.COMMENT(
        '/\\*\\*',
        '\\*/',
        {
          subLanguage: 'markdown',
          subLanguageMode: 'continuous'
        }
      ),
      hljs.COMMENT(
        '///',
        '$',
        {
          subLanguage: 'markdown',
          subLanguageMode: 'continuous'
        }
      ),
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      {
        className: 'class',
        beginKeywords: 'class interface', end: '{', excludeEnd: true,
        contains: [
          {
            beginKeywords: 'extends implements'
          },
          hljs.UNDERSCORE_TITLE_MODE
        ]
      },
      hljs.C_NUMBER_MODE,
      {
        className: 'annotation', begin: '@[A-Za-z]+'
      },
      {
        begin: '=>' // No markup, just a relevance booster
      }
    ]
  }
};
},{}],40:[function(require,module,exports){
module.exports = function(hljs) {
  var KEYWORDS =
    'exports register file shl array record property for mod while set ally label uses raise not ' +
    'stored class safecall var interface or private static exit index inherited to else stdcall ' +
    'override shr asm far resourcestring finalization packed virtual out and protected library do ' +
    'xorwrite goto near function end div overload object unit begin string on inline repeat until ' +
    'destructor write message program with read initialization except default nil if case cdecl in ' +
    'downto threadvar of try pascal const external constructor type public then implementation ' +
    'finally published procedure';
  var COMMENT_MODES = [
    hljs.C_LINE_COMMENT_MODE,
    hljs.COMMENT(
      /\{/,
      /\}/,
      {
        relevance: 0
      }
    ),
    hljs.COMMENT(
      /\(\*/,
      /\*\)/,
      {
        relevance: 10
      }
    )
  ];
  var STRING = {
    className: 'string',
    begin: /'/, end: /'/,
    contains: [{begin: /''/}]
  };
  var CHAR_STRING = {
    className: 'string', begin: /(#\d+)+/
  };
  var CLASS = {
    begin: hljs.IDENT_RE + '\\s*=\\s*class\\s*\\(', returnBegin: true,
    contains: [
      hljs.TITLE_MODE
    ]
  };
  var FUNCTION = {
    className: 'function',
    beginKeywords: 'function constructor destructor procedure', end: /[:;]/,
    keywords: 'function constructor|10 destructor|10 procedure|10',
    contains: [
      hljs.TITLE_MODE,
      {
        className: 'params',
        begin: /\(/, end: /\)/,
        keywords: KEYWORDS,
        contains: [STRING, CHAR_STRING]
      }
    ].concat(COMMENT_MODES)
  };
  return {
    case_insensitive: true,
    keywords: KEYWORDS,
    illegal: /"|\$[G-Zg-z]|\/\*|<\/|\|/,
    contains: [
      STRING, CHAR_STRING,
      hljs.NUMBER_MODE,
      CLASS,
      FUNCTION
    ].concat(COMMENT_MODES)
  };
};
},{}],41:[function(require,module,exports){
module.exports = function(hljs) {
  return {
    aliases: ['patch'],
    contains: [
      {
        className: 'chunk',
        relevance: 10,
        variants: [
          {begin: /^@@ +\-\d+,\d+ +\+\d+,\d+ +@@$/},
          {begin: /^\*\*\* +\d+,\d+ +\*\*\*\*$/},
          {begin: /^\-\-\- +\d+,\d+ +\-\-\-\-$/}
        ]
      },
      {
        className: 'header',
        variants: [
          {begin: /Index: /, end: /$/},
          {begin: /=====/, end: /=====$/},
          {begin: /^\-\-\-/, end: /$/},
          {begin: /^\*{3} /, end: /$/},
          {begin: /^\+\+\+/, end: /$/},
          {begin: /\*{5}/, end: /\*{5}$/}
        ]
      },
      {
        className: 'addition',
        begin: '^\\+', end: '$'
      },
      {
        className: 'deletion',
        begin: '^\\-', end: '$'
      },
      {
        className: 'change',
        begin: '^\\!', end: '$'
      }
    ]
  };
};
},{}],42:[function(require,module,exports){
module.exports = function(hljs) {
  var FILTER = {
    className: 'filter',
    begin: /\|[A-Za-z]+:?/,
    keywords:
      'truncatewords removetags linebreaksbr yesno get_digit timesince random striptags ' +
      'filesizeformat escape linebreaks length_is ljust rjust cut urlize fix_ampersands ' +
      'title floatformat capfirst pprint divisibleby add make_list unordered_list urlencode ' +
      'timeuntil urlizetrunc wordcount stringformat linenumbers slice date dictsort ' +
      'dictsortreversed default_if_none pluralize lower join center default ' +
      'truncatewords_html upper length phone2numeric wordwrap time addslashes slugify first ' +
      'escapejs force_escape iriencode last safe safeseq truncatechars localize unlocalize ' +
      'localtime utc timezone',
    contains: [
      {className: 'argument', begin: /"/, end: /"/},
      {className: 'argument', begin: /'/, end: /'/}
    ]
  };

  return {
    aliases: ['jinja'],
    case_insensitive: true,
    subLanguage: 'xml', subLanguageMode: 'continuous',
    contains: [
      hljs.COMMENT(/\{%\s*comment\s*%}/, /\{%\s*endcomment\s*%}/),
      hljs.COMMENT(/\{#/, /#}/),
      {
        className: 'template_tag',
        begin: /\{%/, end: /%}/,
        keywords:
          'comment endcomment load templatetag ifchanged endifchanged if endif firstof for ' +
          'endfor in ifnotequal endifnotequal widthratio extends include spaceless ' +
          'endspaceless regroup by as ifequal endifequal ssi now with cycle url filter ' +
          'endfilter debug block endblock else autoescape endautoescape csrf_token empty elif ' +
          'endwith static trans blocktrans endblocktrans get_static_prefix get_media_prefix ' +
          'plural get_current_language language get_available_languages ' +
          'get_current_language_bidi get_language_info get_language_info_list localize ' +
          'endlocalize localtime endlocaltime timezone endtimezone get_current_timezone ' +
          'verbatim',
        contains: [FILTER]
      },
      {
        className: 'variable',
        begin: /\{\{/, end: /}}/,
        contains: [FILTER]
      }
    ]
  };
};
},{}],43:[function(require,module,exports){
module.exports = function(hljs) {
  return {
    aliases: ['bind', 'zone'],
    keywords: {
      keyword:
        'IN A AAAA AFSDB APL CAA CDNSKEY CDS CERT CNAME DHCID DLV DNAME DNSKEY DS HIP IPSECKEY KEY KX ' +
        'LOC MX NAPTR NS NSEC NSEC3 NSEC3PARAM PTR RRSIG RP SIG SOA SRV SSHFP TA TKEY TLSA TSIG TXT'
    },
    contains: [
      hljs.COMMENT(';', '$'),
      {
        className: 'operator',
        beginKeywords: '$TTL $GENERATE $INCLUDE $ORIGIN'
      },
      // IPv6
      {
        className: 'number',
        begin: '((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3}))|:)))'
      },
      // IPv4
      {
        className: 'number',
        begin: '((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])'
      }
    ]
  };
};
},{}],44:[function(require,module,exports){
module.exports = function(hljs) {
  return {
    aliases: ['docker'],
    case_insensitive: true,
    keywords: {
      built_ins: 'from maintainer cmd expose add copy entrypoint volume user workdir onbuild run env'
    },
    contains: [
      hljs.HASH_COMMENT_MODE,
      {
        keywords : {
          built_in: 'run cmd entrypoint volume add copy workdir onbuild'
        },
        begin: /^ *(onbuild +)?(run|cmd|entrypoint|volume|add|copy|workdir) +/,
        starts: {
          end: /[^\\]\n/,
          subLanguage: 'bash', subLanguageMode: 'continuous'
        }
      },
      {
        keywords: {
          built_in: 'from maintainer expose env user onbuild'
        },
        begin: /^ *(onbuild +)?(from|maintainer|expose|env|user|onbuild) +/, end: /[^\\]\n/,
        contains: [
          hljs.APOS_STRING_MODE,
          hljs.QUOTE_STRING_MODE,
          hljs.NUMBER_MODE,
          hljs.HASH_COMMENT_MODE
        ]
      }
    ]
  }
};
},{}],45:[function(require,module,exports){
module.exports = function(hljs) {
  var COMMENT = hljs.COMMENT(
    /@?rem\b/, /$/,
    {
      relevance: 10
    }
  );
  var LABEL = {
    className: 'label',
    begin: '^\\s*[A-Za-z._?][A-Za-z0-9_$#@~.?]*(:|\\s+label)',
    relevance: 0
  };
  return {
    aliases: ['bat', 'cmd'],
    case_insensitive: true,
    keywords: {
      flow: 'if else goto for in do call exit not exist errorlevel defined',
      operator: 'equ neq lss leq gtr geq',
      keyword: 'shift cd dir echo setlocal endlocal set pause copy',
      stream: 'prn nul lpt3 lpt2 lpt1 con com4 com3 com2 com1 aux',
      winutils: 'ping net ipconfig taskkill xcopy ren del',
      built_in: 'append assoc at attrib break cacls cd chcp chdir chkdsk chkntfs cls cmd color ' +
        'comp compact convert date dir diskcomp diskcopy doskey erase fs ' +
        'find findstr format ftype graftabl help keyb label md mkdir mode more move path ' +
        'pause print popd pushd promt rd recover rem rename replace restore rmdir shift' +
        'sort start subst time title tree type ver verify vol'
    },
    contains: [
      {
        className: 'envvar', begin: /%%[^ ]|%[^ ]+?%|![^ ]+?!/
      },
      {
        className: 'function',
        begin: LABEL.begin, end: 'goto:eof',
        contains: [
          hljs.inherit(hljs.TITLE_MODE, {begin: '([_a-zA-Z]\\w*\\.)*([_a-zA-Z]\\w*:)?[_a-zA-Z]\\w*'}),
          COMMENT
        ]
      },
      {
        className: 'number', begin: '\\b\\d+',
        relevance: 0
      },
      COMMENT
    ]
  };
};
},{}],46:[function(require,module,exports){
module.exports = function(hljs) {
  var EXPRESSION_KEYWORDS = 'if eq ne lt lte gt gte select default math sep';
  return {
    aliases: ['dst'],
    case_insensitive: true,
    subLanguage: 'xml', subLanguageMode: 'continuous',
    contains: [
      {
        className: 'expression',
        begin: '{', end: '}',
        relevance: 0,
        contains: [
          {
            className: 'begin-block', begin: '\#[a-zA-Z\-\ \.]+',
            keywords: EXPRESSION_KEYWORDS
          },
          {
            className: 'string',
            begin: '"', end: '"'
          },
          {
            className: 'end-block', begin: '\\\/[a-zA-Z\-\ \.]+',
            keywords: EXPRESSION_KEYWORDS
          },
          {
            className: 'variable', begin: '[a-zA-Z\-\.]+',
            keywords: EXPRESSION_KEYWORDS,
            relevance: 0
          }
        ]
      }
    ]
  };
};
},{}],47:[function(require,module,exports){
module.exports = function(hljs) {
  var ELIXIR_IDENT_RE = '[a-zA-Z_][a-zA-Z0-9_]*(\\!|\\?)?';
  var ELIXIR_METHOD_RE = '[a-zA-Z_]\\w*[!?=]?|[-+~]\\@|<<|>>|=~|===?|<=>|[<>]=?|\\*\\*|[-/+%^&*~`|]|\\[\\]=?';
  var ELIXIR_KEYWORDS =
    'and false then defined module in return redo retry end for true self when ' +
    'next until do begin unless nil break not case cond alias while ensure or ' +
    'include use alias fn quote';
  var SUBST = {
    className: 'subst',
    begin: '#\\{', end: '}',
    lexemes: ELIXIR_IDENT_RE,
    keywords: ELIXIR_KEYWORDS
  };
  var STRING = {
    className: 'string',
    contains: [hljs.BACKSLASH_ESCAPE, SUBST],
    variants: [
      {
        begin: /'/, end: /'/
      },
      {
        begin: /"/, end: /"/
      }
    ]
  };
  var FUNCTION = {
    className: 'function',
    beginKeywords: 'def defp defmacro', end: /\B\b/, // the mode is ended by the title
    contains: [
      hljs.inherit(hljs.TITLE_MODE, {
        begin: ELIXIR_IDENT_RE,
        endsParent: true
      })
    ]
  };
  var CLASS = hljs.inherit(FUNCTION, {
    className: 'class',
    beginKeywords: 'defmodule defrecord', end: /\bdo\b|$|;/
  });
  var ELIXIR_DEFAULT_CONTAINS = [
    STRING,
    hljs.HASH_COMMENT_MODE,
    CLASS,
    FUNCTION,
    {
      className: 'constant',
      begin: '(\\b[A-Z_]\\w*(.)?)+',
      relevance: 0
    },
    {
      className: 'symbol',
      begin: ':',
      contains: [STRING, {begin: ELIXIR_METHOD_RE}],
      relevance: 0
    },
    {
      className: 'symbol',
      begin: ELIXIR_IDENT_RE + ':',
      relevance: 0
    },
    {
      className: 'number',
      begin: '(\\b0[0-7_]+)|(\\b0x[0-9a-fA-F_]+)|(\\b[1-9][0-9_]*(\\.[0-9_]+)?)|[0_]\\b',
      relevance: 0
    },
    {
      className: 'variable',
      begin: '(\\$\\W)|((\\$|\\@\\@?)(\\w+))'
    },
    {
      begin: '->'
    },
    { // regexp container
      begin: '(' + hljs.RE_STARTERS_RE + ')\\s*',
      contains: [
        hljs.HASH_COMMENT_MODE,
        {
          className: 'regexp',
          illegal: '\\n',
          contains: [hljs.BACKSLASH_ESCAPE, SUBST],
          variants: [
            {
              begin: '/', end: '/[a-z]*'
            },
            {
              begin: '%r\\[', end: '\\][a-z]*'
            }
          ]
        }
      ],
      relevance: 0
    }
  ];
  SUBST.contains = ELIXIR_DEFAULT_CONTAINS;

  return {
    lexemes: ELIXIR_IDENT_RE,
    keywords: ELIXIR_KEYWORDS,
    contains: ELIXIR_DEFAULT_CONTAINS
  };
};
},{}],48:[function(require,module,exports){
module.exports = function(hljs) {
  return {
    subLanguage: 'xml', subLanguageMode: 'continuous',
    contains: [
      hljs.COMMENT('<%#', '%>'),
      {
        begin: '<%[%=-]?', end: '[%-]?%>',
        subLanguage: 'ruby',
        excludeBegin: true,
        excludeEnd: true
      }
    ]
  };
};
},{}],49:[function(require,module,exports){
module.exports = function(hljs) {
  return {
    keywords: {
      special_functions:
        'spawn spawn_link self',
      reserved:
        'after and andalso|10 band begin bnot bor bsl bsr bxor case catch cond div end fun if ' +
        'let not of or orelse|10 query receive rem try when xor'
    },
    contains: [
      {
        className: 'prompt', begin: '^[0-9]+> ',
        relevance: 10
      },
      hljs.COMMENT('%', '$'),
      {
        className: 'number',
        begin: '\\b(\\d+#[a-fA-F0-9]+|\\d+(\\.\\d+)?([eE][-+]?\\d+)?)',
        relevance: 0
      },
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE,
      {
        className: 'constant', begin: '\\?(::)?([A-Z]\\w*(::)?)+'
      },
      {
        className: 'arrow', begin: '->'
      },
      {
        className: 'ok', begin: 'ok'
      },
      {
        className: 'exclamation_mark', begin: '!'
      },
      {
        className: 'function_or_atom',
        begin: '(\\b[a-z\'][a-zA-Z0-9_\']*:[a-z\'][a-zA-Z0-9_\']*)|(\\b[a-z\'][a-zA-Z0-9_\']*)',
        relevance: 0
      },
      {
        className: 'variable',
        begin: '[A-Z][a-zA-Z0-9_\']*',
        relevance: 0
      }
    ]
  };
};
},{}],50:[function(require,module,exports){
module.exports = function(hljs) {
  var BASIC_ATOM_RE = '[a-z\'][a-zA-Z0-9_\']*';
  var FUNCTION_NAME_RE = '(' + BASIC_ATOM_RE + ':' + BASIC_ATOM_RE + '|' + BASIC_ATOM_RE + ')';
  var ERLANG_RESERVED = {
    keyword:
      'after and andalso|10 band begin bnot bor bsl bzr bxor case catch cond div end fun if ' +
      'let not of orelse|10 query receive rem try when xor',
    literal:
      'false true'
  };

  var COMMENT = hljs.COMMENT('%', '$');
  var NUMBER = {
    className: 'number',
    begin: '\\b(\\d+#[a-fA-F0-9]+|\\d+(\\.\\d+)?([eE][-+]?\\d+)?)',
    relevance: 0
  };
  var NAMED_FUN = {
    begin: 'fun\\s+' + BASIC_ATOM_RE + '/\\d+'
  };
  var FUNCTION_CALL = {
    begin: FUNCTION_NAME_RE + '\\(', end: '\\)',
    returnBegin: true,
    relevance: 0,
    contains: [
      {
        className: 'function_name', begin: FUNCTION_NAME_RE,
        relevance: 0
      },
      {
        begin: '\\(', end: '\\)', endsWithParent: true,
        returnEnd: true,
        relevance: 0
        // "contains" defined later
      }
    ]
  };
  var TUPLE = {
    className: 'tuple',
    begin: '{', end: '}',
    relevance: 0
    // "contains" defined later
  };
  var VAR1 = {
    className: 'variable',
    begin: '\\b_([A-Z][A-Za-z0-9_]*)?',
    relevance: 0
  };
  var VAR2 = {
    className: 'variable',
    begin: '[A-Z][a-zA-Z0-9_]*',
    relevance: 0
  };
  var RECORD_ACCESS = {
    begin: '#' + hljs.UNDERSCORE_IDENT_RE,
    relevance: 0,
    returnBegin: true,
    contains: [
      {
        className: 'record_name',
        begin: '#' + hljs.UNDERSCORE_IDENT_RE,
        relevance: 0
      },
      {
        begin: '{', end: '}',
        relevance: 0
        // "contains" defined later
      }
    ]
  };

  var BLOCK_STATEMENTS = {
    beginKeywords: 'fun receive if try case', end: 'end',
    keywords: ERLANG_RESERVED
  };
  BLOCK_STATEMENTS.contains = [
    COMMENT,
    NAMED_FUN,
    hljs.inherit(hljs.APOS_STRING_MODE, {className: ''}),
    BLOCK_STATEMENTS,
    FUNCTION_CALL,
    hljs.QUOTE_STRING_MODE,
    NUMBER,
    TUPLE,
    VAR1, VAR2,
    RECORD_ACCESS
  ];

  var BASIC_MODES = [
    COMMENT,
    NAMED_FUN,
    BLOCK_STATEMENTS,
    FUNCTION_CALL,
    hljs.QUOTE_STRING_MODE,
    NUMBER,
    TUPLE,
    VAR1, VAR2,
    RECORD_ACCESS
  ];
  FUNCTION_CALL.contains[1].contains = BASIC_MODES;
  TUPLE.contains = BASIC_MODES;
  RECORD_ACCESS.contains[1].contains = BASIC_MODES;

  var PARAMS = {
    className: 'params',
    begin: '\\(', end: '\\)',
    contains: BASIC_MODES
  };
  return {
    aliases: ['erl'],
    keywords: ERLANG_RESERVED,
    illegal: '(</|\\*=|\\+=|-=|/\\*|\\*/|\\(\\*|\\*\\))',
    contains: [
      {
        className: 'function',
        begin: '^' + BASIC_ATOM_RE + '\\s*\\(', end: '->',
        returnBegin: true,
        illegal: '\\(|#|//|/\\*|\\\\|:|;',
        contains: [
          PARAMS,
          hljs.inherit(hljs.TITLE_MODE, {begin: BASIC_ATOM_RE})
        ],
        starts: {
          end: ';|\\.',
          keywords: ERLANG_RESERVED,
          contains: BASIC_MODES
        }
      },
      COMMENT,
      {
        className: 'pp',
        begin: '^-', end: '\\.',
        relevance: 0,
        excludeEnd: true,
        returnBegin: true,
        lexemes: '-' + hljs.IDENT_RE,
        keywords:
          '-module -record -undef -export -ifdef -ifndef -author -copyright -doc -vsn ' +
          '-import -include -include_lib -compile -define -else -endif -file -behaviour ' +
          '-behavior -spec',
        contains: [PARAMS]
      },
      NUMBER,
      hljs.QUOTE_STRING_MODE,
      RECORD_ACCESS,
      VAR1, VAR2,
      TUPLE,
      {begin: /\.$/} // relevance booster
    ]
  };
};
},{}],51:[function(require,module,exports){
module.exports = function(hljs) {
  return {
    contains: [
    {
      begin: /[^\u2401\u0001]+/,
      end: /[\u2401\u0001]/,
      excludeEnd: true,
      returnBegin: true,
      returnEnd: false,
      contains: [
      {
        begin: /([^\u2401\u0001=]+)/,
        end: /=([^\u2401\u0001=]+)/,
        returnEnd: true,
        returnBegin: false,
        className: 'attribute'
      },
      {
        begin: /=/,
        end: /([\u2401\u0001])/,
        excludeEnd: true,
        excludeBegin: true,
        className: 'string'
      }]
    }],
    case_insensitive: true
  };
};
},{}],52:[function(require,module,exports){
module.exports = function(hljs) {
  var PARAMS = {
    className: 'params',
    begin: '\\(', end: '\\)'
  };

  var F_KEYWORDS = {
    constant: '.False. .True.',
    type: 'integer real character complex logical dimension allocatable|10 parameter ' +
      'external implicit|10 none double precision assign intent optional pointer ' +
      'target in out common equivalence data',
    keyword: 'kind do while private call intrinsic where elsewhere ' +
      'type endtype endmodule endselect endinterface end enddo endif if forall endforall only contains default return stop then ' +
      'public subroutine|10 function program .and. .or. .not. .le. .eq. .ge. .gt. .lt. ' +
      'goto save else use module select case ' +
      'access blank direct exist file fmt form formatted iostat name named nextrec number opened rec recl sequential status unformatted unit ' +
      'continue format pause cycle exit ' +
      'c_null_char c_alert c_backspace c_form_feed flush wait decimal round iomsg ' +
      'synchronous nopass non_overridable pass protected volatile abstract extends import ' +
      'non_intrinsic value deferred generic final enumerator class associate bind enum ' +
      'c_int c_short c_long c_long_long c_signed_char c_size_t c_int8_t c_int16_t c_int32_t c_int64_t c_int_least8_t c_int_least16_t ' +
      'c_int_least32_t c_int_least64_t c_int_fast8_t c_int_fast16_t c_int_fast32_t c_int_fast64_t c_intmax_t C_intptr_t c_float c_double ' +
      'c_long_double c_float_complex c_double_complex c_long_double_complex c_bool c_char c_null_ptr c_null_funptr ' +
      'c_new_line c_carriage_return c_horizontal_tab c_vertical_tab iso_c_binding c_loc c_funloc c_associated  c_f_pointer ' +
      'c_ptr c_funptr iso_fortran_env character_storage_size error_unit file_storage_size input_unit iostat_end iostat_eor ' +
      'numeric_storage_size output_unit c_f_procpointer ieee_arithmetic ieee_support_underflow_control ' +
      'ieee_get_underflow_mode ieee_set_underflow_mode newunit contiguous ' +
      'pad position action delim readwrite eor advance nml interface procedure namelist include sequence elemental pure',
    built_in: 'alog alog10 amax0 amax1 amin0 amin1 amod cabs ccos cexp clog csin csqrt dabs dacos dasin datan datan2 dcos dcosh ddim dexp dint ' +
      'dlog dlog10 dmax1 dmin1 dmod dnint dsign dsin dsinh dsqrt dtan dtanh float iabs idim idint idnint ifix isign max0 max1 min0 min1 sngl ' +
      'algama cdabs cdcos cdexp cdlog cdsin cdsqrt cqabs cqcos cqexp cqlog cqsin cqsqrt dcmplx dconjg derf derfc dfloat dgamma dimag dlgama ' +
      'iqint qabs qacos qasin qatan qatan2 qcmplx qconjg qcos qcosh qdim qerf qerfc qexp qgamma qimag qlgama qlog qlog10 qmax1 qmin1 qmod ' +
      'qnint qsign qsin qsinh qsqrt qtan qtanh abs acos aimag aint anint asin atan atan2 char cmplx conjg cos cosh exp ichar index int log ' +
      'log10 max min nint sign sin sinh sqrt tan tanh print write dim lge lgt lle llt mod nullify allocate deallocate ' +
      'adjustl adjustr all allocated any associated bit_size btest ceiling count cshift date_and_time digits dot_product ' +
      'eoshift epsilon exponent floor fraction huge iand ibclr ibits ibset ieor ior ishft ishftc lbound len_trim matmul ' +
      'maxexponent maxloc maxval merge minexponent minloc minval modulo mvbits nearest pack present product ' +
      'radix random_number random_seed range repeat reshape rrspacing scale scan selected_int_kind selected_real_kind ' +
      'set_exponent shape size spacing spread sum system_clock tiny transpose trim ubound unpack verify achar iachar transfer ' +
      'dble entry dprod cpu_time command_argument_count get_command get_command_argument get_environment_variable is_iostat_end ' +
      'ieee_arithmetic ieee_support_underflow_control ieee_get_underflow_mode ieee_set_underflow_mode ' +
      'is_iostat_eor move_alloc new_line selected_char_kind same_type_as extends_type_of'  +
      'acosh asinh atanh bessel_j0 bessel_j1 bessel_jn bessel_y0 bessel_y1 bessel_yn erf erfc erfc_scaled gamma log_gamma hypot norm2 ' +
      'atomic_define atomic_ref execute_command_line leadz trailz storage_size merge_bits ' +
      'bge bgt ble blt dshiftl dshiftr findloc iall iany iparity image_index lcobound ucobound maskl maskr ' +
      'num_images parity popcnt poppar shifta shiftl shiftr this_image'
  };
  return {
    case_insensitive: true,
    aliases: ['f90', 'f95'],
    keywords: F_KEYWORDS,
    contains: [
      hljs.inherit(hljs.APOS_STRING_MODE, {className: 'string', relevance: 0}),
      hljs.inherit(hljs.QUOTE_STRING_MODE,{className: 'string', relevance: 0}),
      {
        className: 'function',
        beginKeywords: 'subroutine function program',
        illegal: '[${=\\n]',
        contains: [hljs.UNDERSCORE_TITLE_MODE, PARAMS]
      },
      hljs.COMMENT('!', '$', {relevance: 0}),
      {
        className: 'number',
        begin: '(?=\\b|\\+|\\-|\\.)(?=\\.\\d|\\d)(?:\\d+)?(?:\\.?\\d*)(?:[de][+-]?\\d+)?\\b\\.?',
        relevance: 0
      }
    ]
  };
};
},{}],53:[function(require,module,exports){
module.exports = function(hljs) {
  var TYPEPARAM = {
    begin: '<', end: '>',
    contains: [
      hljs.inherit(hljs.TITLE_MODE, {begin: /'[a-zA-Z0-9_]+/})
    ]
  };

  return {
    aliases: ['fs'],
    keywords:
      // monad builder keywords (at top, matches before non-bang kws)
      'yield! return! let! do!' +
      // regular keywords
      'abstract and as assert base begin class default delegate do done ' +
      'downcast downto elif else end exception extern false finally for ' +
      'fun function global if in inherit inline interface internal lazy let ' +
      'match member module mutable namespace new null of open or ' +
      'override private public rec return sig static struct then to ' +
      'true try type upcast use val void when while with yield',
    contains: [
      {
        className: 'string',
        begin: '@"', end: '"',
        contains: [{begin: '""'}]
      },
      {
        className: 'string',
        begin: '"""', end: '"""'
      },
      hljs.COMMENT('\\(\\*', '\\*\\)'),
      {
        className: 'class',
        beginKeywords: 'type', end: '\\(|=|$', excludeEnd: true,
        contains: [
          hljs.UNDERSCORE_TITLE_MODE,
          TYPEPARAM
        ]
      },
      {
        className: 'annotation',
        begin: '\\[<', end: '>\\]',
        relevance: 10
      },
      {
        className: 'attribute',
        begin: '\\B(\'[A-Za-z])\\b',
        contains: [hljs.BACKSLASH_ESCAPE]
      },
      hljs.C_LINE_COMMENT_MODE,
      hljs.inherit(hljs.QUOTE_STRING_MODE, {illegal: null}),
      hljs.C_NUMBER_MODE
    ]
  };
};
},{}],54:[function(require,module,exports){
module.exports = function(hljs) {
    var GCODE_IDENT_RE = '[A-Z_][A-Z0-9_.]*';
    var GCODE_CLOSE_RE = '\\%';
    var GCODE_KEYWORDS = {
        literal:
            '',
        built_in:
            '',
        keyword:
            'IF DO WHILE ENDWHILE CALL ENDIF SUB ENDSUB GOTO REPEAT ENDREPEAT ' +
            'EQ LT GT NE GE LE OR XOR'
    };
    var GCODE_START = {
        className: 'preprocessor',
        begin: '([O])([0-9]+)'
    };
    var GCODE_CODE = [
        hljs.C_LINE_COMMENT_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        hljs.COMMENT(/\(/, /\)/),
        hljs.inherit(hljs.C_NUMBER_MODE, {begin: '([-+]?([0-9]*\\.?[0-9]+\\.?))|' + hljs.C_NUMBER_RE}),
        hljs.inherit(hljs.APOS_STRING_MODE, {illegal: null}),
        hljs.inherit(hljs.QUOTE_STRING_MODE, {illegal: null}),
        {
            className: 'keyword',
            begin: '([G])([0-9]+\\.?[0-9]?)'
        },
        {
            className: 'title',
            begin: '([M])([0-9]+\\.?[0-9]?)'
        },
        {
            className: 'title',
            begin: '(VC|VS|#)',
            end: '(\\d+)'
        },
        {
            className: 'title',
            begin: '(VZOFX|VZOFY|VZOFZ)'
        },
        {
            className: 'built_in',
            begin: '(ATAN|ABS|ACOS|ASIN|SIN|COS|EXP|FIX|FUP|ROUND|LN|TAN)(\\[)',
            end: '([-+]?([0-9]*\\.?[0-9]+\\.?))(\\])'
        },
        {
            className: 'label',
            variants: [
                {
                    begin: 'N', end: '\\d+',
                    illegal: '\\W'
                }
            ]
        }
    ];

    return {
        aliases: ['nc'],
        // Some implementations (CNC controls) of G-code are interoperable with uppercase and lowercase letters seamlessly.
        // However, most prefer all uppercase and uppercase is customary.
        case_insensitive: true,
        lexemes: GCODE_IDENT_RE,
        keywords: GCODE_KEYWORDS,
        contains: [
            {
                className: 'preprocessor',
                begin: GCODE_CLOSE_RE
            },
            GCODE_START
        ].concat(GCODE_CODE)
    };
};
},{}],55:[function(require,module,exports){
module.exports = function (hljs) {
  return {
    aliases: ['feature'],
    keywords: 'Feature Background Ability Business\ Need Scenario Scenarios Scenario\ Outline Scenario\ Template Examples Given And Then But When',
    contains: [
      {
        className: 'keyword',
        begin: '\\*'
      },
      hljs.COMMENT('@[^@\r\n\t ]+', '$'),
      {
        begin: '\\|', end: '\\|\\w*$',
        contains: [
          {
            className: 'string',
            begin: '[^|]+'
          }
        ]
      },
      {
        className: 'variable',
        begin: '<', end: '>'
      },
      hljs.HASH_COMMENT_MODE,
      {
        className: 'string',
        begin: '"""', end: '"""'
      },
      hljs.QUOTE_STRING_MODE
    ]
  };
};
},{}],56:[function(require,module,exports){
module.exports = function(hljs) {
  return {
    keywords: {
      keyword:
        'atomic_uint attribute bool break bvec2 bvec3 bvec4 case centroid coherent const continue default ' +
        'discard dmat2 dmat2x2 dmat2x3 dmat2x4 dmat3 dmat3x2 dmat3x3 dmat3x4 dmat4 dmat4x2 dmat4x3 ' +
        'dmat4x4 do double dvec2 dvec3 dvec4 else flat float for highp if iimage1D iimage1DArray ' +
        'iimage2D iimage2DArray iimage2DMS iimage2DMSArray iimage2DRect iimage3D iimageBuffer iimageCube ' +
        'iimageCubeArray image1D image1DArray image2D image2DArray image2DMS image2DMSArray image2DRect ' +
        'image3D imageBuffer imageCube imageCubeArray in inout int invariant isampler1D isampler1DArray ' +
        'isampler2D isampler2DArray isampler2DMS isampler2DMSArray isampler2DRect isampler3D isamplerBuffer ' +
        'isamplerCube isamplerCubeArray ivec2 ivec3 ivec4 layout lowp mat2 mat2x2 mat2x3 mat2x4 mat3 mat3x2 ' +
        'mat3x3 mat3x4 mat4 mat4x2 mat4x3 mat4x4 mediump noperspective out patch precision readonly restrict ' +
        'return sample sampler1D sampler1DArray sampler1DArrayShadow sampler1DShadow sampler2D sampler2DArray ' +
        'sampler2DArrayShadow sampler2DMS sampler2DMSArray sampler2DRect sampler2DRectShadow sampler2DShadow ' +
        'sampler3D samplerBuffer samplerCube samplerCubeArray samplerCubeArrayShadow samplerCubeShadow smooth ' +
        'struct subroutine switch uimage1D uimage1DArray uimage2D uimage2DArray uimage2DMS uimage2DMSArray ' +
        'uimage2DRect uimage3D uimageBuffer uimageCube uimageCubeArray uint uniform usampler1D usampler1DArray ' +
        'usampler2D usampler2DArray usampler2DMS usampler2DMSArray usampler2DRect usampler3D usamplerBuffer ' +
        'usamplerCube usamplerCubeArray uvec2 uvec3 uvec4 varying vec2 vec3 vec4 void volatile while writeonly',
      built_in:
        'gl_BackColor gl_BackLightModelProduct gl_BackLightProduct gl_BackMaterial ' +
        'gl_BackSecondaryColor gl_ClipDistance gl_ClipPlane gl_ClipVertex gl_Color ' +
        'gl_DepthRange gl_EyePlaneQ gl_EyePlaneR gl_EyePlaneS gl_EyePlaneT gl_Fog gl_FogCoord ' +
        'gl_FogFragCoord gl_FragColor gl_FragCoord gl_FragData gl_FragDepth gl_FrontColor ' +
        'gl_FrontFacing gl_FrontLightModelProduct gl_FrontLightProduct gl_FrontMaterial ' +
        'gl_FrontSecondaryColor gl_InstanceID gl_InvocationID gl_Layer gl_LightModel ' +
        'gl_LightSource gl_MaxAtomicCounterBindings gl_MaxAtomicCounterBufferSize ' +
        'gl_MaxClipDistances gl_MaxClipPlanes gl_MaxCombinedAtomicCounterBuffers ' +
        'gl_MaxCombinedAtomicCounters gl_MaxCombinedImageUniforms gl_MaxCombinedImageUnitsAndFragmentOutputs ' +
        'gl_MaxCombinedTextureImageUnits gl_MaxDrawBuffers gl_MaxFragmentAtomicCounterBuffers ' +
        'gl_MaxFragmentAtomicCounters gl_MaxFragmentImageUniforms gl_MaxFragmentInputComponents ' +
        'gl_MaxFragmentUniformComponents gl_MaxFragmentUniformVectors gl_MaxGeometryAtomicCounterBuffers ' +
        'gl_MaxGeometryAtomicCounters gl_MaxGeometryImageUniforms gl_MaxGeometryInputComponents ' +
        'gl_MaxGeometryOutputComponents gl_MaxGeometryOutputVertices gl_MaxGeometryTextureImageUnits ' +
        'gl_MaxGeometryTotalOutputComponents gl_MaxGeometryUniformComponents gl_MaxGeometryVaryingComponents ' +
        'gl_MaxImageSamples gl_MaxImageUnits gl_MaxLights gl_MaxPatchVertices gl_MaxProgramTexelOffset ' +
        'gl_MaxTessControlAtomicCounterBuffers gl_MaxTessControlAtomicCounters gl_MaxTessControlImageUniforms ' +
        'gl_MaxTessControlInputComponents gl_MaxTessControlOutputComponents gl_MaxTessControlTextureImageUnits ' +
        'gl_MaxTessControlTotalOutputComponents gl_MaxTessControlUniformComponents ' +
        'gl_MaxTessEvaluationAtomicCounterBuffers gl_MaxTessEvaluationAtomicCounters ' +
        'gl_MaxTessEvaluationImageUniforms gl_MaxTessEvaluationInputComponents gl_MaxTessEvaluationOutputComponents ' +
        'gl_MaxTessEvaluationTextureImageUnits gl_MaxTessEvaluationUniformComponents ' +
        'gl_MaxTessGenLevel gl_MaxTessPatchComponents gl_MaxTextureCoords gl_MaxTextureImageUnits ' +
        'gl_MaxTextureUnits gl_MaxVaryingComponents gl_MaxVaryingFloats gl_MaxVaryingVectors ' +
        'gl_MaxVertexAtomicCounterBuffers gl_MaxVertexAtomicCounters gl_MaxVertexAttribs ' +
        'gl_MaxVertexImageUniforms gl_MaxVertexOutputComponents gl_MaxVertexTextureImageUnits ' +
        'gl_MaxVertexUniformComponents gl_MaxVertexUniformVectors gl_MaxViewports gl_MinProgramTexelOffset'+
        'gl_ModelViewMatrix gl_ModelViewMatrixInverse gl_ModelViewMatrixInverseTranspose ' +
        'gl_ModelViewMatrixTranspose gl_ModelViewProjectionMatrix gl_ModelViewProjectionMatrixInverse ' +
        'gl_ModelViewProjectionMatrixInverseTranspose gl_ModelViewProjectionMatrixTranspose ' +
        'gl_MultiTexCoord0 gl_MultiTexCoord1 gl_MultiTexCoord2 gl_MultiTexCoord3 gl_MultiTexCoord4 ' +
        'gl_MultiTexCoord5 gl_MultiTexCoord6 gl_MultiTexCoord7 gl_Normal gl_NormalMatrix ' +
        'gl_NormalScale gl_ObjectPlaneQ gl_ObjectPlaneR gl_ObjectPlaneS gl_ObjectPlaneT gl_PatchVerticesIn ' +
        'gl_PerVertex gl_Point gl_PointCoord gl_PointSize gl_Position gl_PrimitiveID gl_PrimitiveIDIn ' +
        'gl_ProjectionMatrix gl_ProjectionMatrixInverse gl_ProjectionMatrixInverseTranspose ' +
        'gl_ProjectionMatrixTranspose gl_SampleID gl_SampleMask gl_SampleMaskIn gl_SamplePosition ' +
        'gl_SecondaryColor gl_TessCoord gl_TessLevelInner gl_TessLevelOuter gl_TexCoord gl_TextureEnvColor ' +
        'gl_TextureMatrixInverseTranspose gl_TextureMatrixTranspose gl_Vertex gl_VertexID ' +
        'gl_ViewportIndex gl_in gl_out EmitStreamVertex EmitVertex EndPrimitive EndStreamPrimitive ' +
        'abs acos acosh all any asin asinh atan atanh atomicCounter atomicCounterDecrement ' +
        'atomicCounterIncrement barrier bitCount bitfieldExtract bitfieldInsert bitfieldReverse ' +
        'ceil clamp cos cosh cross dFdx dFdy degrees determinant distance dot equal exp exp2 faceforward ' +
        'findLSB findMSB floatBitsToInt floatBitsToUint floor fma fract frexp ftransform fwidth greaterThan ' +
        'greaterThanEqual imageAtomicAdd imageAtomicAnd imageAtomicCompSwap imageAtomicExchange ' +
        'imageAtomicMax imageAtomicMin imageAtomicOr imageAtomicXor imageLoad imageStore imulExtended ' +
        'intBitsToFloat interpolateAtCentroid interpolateAtOffset interpolateAtSample inverse inversesqrt ' +
        'isinf isnan ldexp length lessThan lessThanEqual log log2 matrixCompMult max memoryBarrier ' +
        'min mix mod modf noise1 noise2 noise3 noise4 normalize not notEqual outerProduct packDouble2x32 ' +
        'packHalf2x16 packSnorm2x16 packSnorm4x8 packUnorm2x16 packUnorm4x8 pow radians reflect refract ' +
        'round roundEven shadow1D shadow1DLod shadow1DProj shadow1DProjLod shadow2D shadow2DLod shadow2DProj ' +
        'shadow2DProjLod sign sin sinh smoothstep sqrt step tan tanh texelFetch texelFetchOffset texture ' +
        'texture1D texture1DLod texture1DProj texture1DProjLod texture2D texture2DLod texture2DProj ' +
        'texture2DProjLod texture3D texture3DLod texture3DProj texture3DProjLod textureCube textureCubeLod ' +
        'textureGather textureGatherOffset textureGatherOffsets textureGrad textureGradOffset textureLod ' +
        'textureLodOffset textureOffset textureProj textureProjGrad textureProjGradOffset textureProjLod ' +
        'textureProjLodOffset textureProjOffset textureQueryLod textureSize transpose trunc uaddCarry ' +
        'uintBitsToFloat umulExtended unpackDouble2x32 unpackHalf2x16 unpackSnorm2x16 unpackSnorm4x8 ' +
        'unpackUnorm2x16 unpackUnorm4x8 usubBorrow gl_TextureMatrix gl_TextureMatrixInverse',
      literal: 'true false'
    },
    illegal: '"',
    contains: [
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      hljs.C_NUMBER_MODE,
      {
        className: 'preprocessor',
        begin: '#', end: '$'
      }
    ]
  };
};
},{}],57:[function(require,module,exports){
module.exports = function(hljs) {
  var GO_KEYWORDS = {
    keyword:
      'break default func interface select case map struct chan else goto package switch ' +
      'const fallthrough if range type continue for import return var go defer',
    constant:
       'true false iota nil',
    typename:
      'bool byte complex64 complex128 float32 float64 int8 int16 int32 int64 string uint8 ' +
      'uint16 uint32 uint64 int uint uintptr rune',
    built_in:
      'append cap close complex copy imag len make new panic print println real recover delete'
  };
  return {
    aliases: ["golang"],
    keywords: GO_KEYWORDS,
    illegal: '</',
    contains: [
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      hljs.QUOTE_STRING_MODE,
      {
        className: 'string',
        begin: '\'', end: '[^\\\\]\''
      },
      {
        className: 'string',
        begin: '`', end: '`'
      },
      {
        className: 'number',
        begin: hljs.C_NUMBER_RE + '[dflsi]?',
        relevance: 0
      },
      hljs.C_NUMBER_MODE
    ]
  };
};
},{}],58:[function(require,module,exports){
module.exports = function(hljs) {
  return {
    case_insensitive: true,
    keywords: {
      keyword:
        'task project allprojects subprojects artifacts buildscript configurations ' +
        'dependencies repositories sourceSets description delete from into include ' +
        'exclude source classpath destinationDir includes options sourceCompatibility ' +
        'targetCompatibility group flatDir doLast doFirst flatten todir fromdir ant ' +
        'def abstract break case catch continue default do else extends final finally ' +
        'for if implements instanceof native new private protected public return static ' +
        'switch synchronized throw throws transient try volatile while strictfp package ' +
        'import false null super this true antlrtask checkstyle codenarc copy boolean ' +
        'byte char class double float int interface long short void compile runTime ' +
        'file fileTree abs any append asList asWritable call collect compareTo count ' +
        'div dump each eachByte eachFile eachLine every find findAll flatten getAt ' +
        'getErr getIn getOut getText grep immutable inject inspect intersect invokeMethods ' +
        'isCase join leftShift minus multiply newInputStream newOutputStream newPrintWriter ' +
        'newReader newWriter next plus pop power previous print println push putAt read ' +
        'readBytes readLines reverse reverseEach round size sort splitEachLine step subMap ' +
        'times toInteger toList tokenize upto waitForOrKill withPrintWriter withReader ' +
        'withStream withWriter withWriterAppend write writeLine'
    },
    contains: [
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE,
      hljs.NUMBER_MODE,
      hljs.REGEXP_MODE

    ]
  }
};
},{}],59:[function(require,module,exports){
module.exports = function(hljs) {
    return {
        keywords: {
            typename: 'byte short char int long boolean float double void',
            literal : 'true false null',
            keyword:
            // groovy specific keywords
            'def as in assert trait ' +
            // common keywords with Java
            'super this abstract static volatile transient public private protected synchronized final ' +
            'class interface enum if else for while switch case break default continue ' +
            'throw throws try catch finally implements extends new import package return instanceof'
        },

        contains: [
            hljs.COMMENT(
                '/\\*\\*',
                '\\*/',
                {
                    relevance : 0,
                    contains : [{
                        className : 'doctag',
                        begin : '@[A-Za-z]+'
                    }]
                }
            ),
            hljs.C_LINE_COMMENT_MODE,
            hljs.C_BLOCK_COMMENT_MODE,
            {
                className: 'string',
                begin: '"""', end: '"""'
            },
            {
                className: 'string',
                begin: "'''", end: "'''"
            },
            {
                className: 'string',
                begin: "\\$/", end: "/\\$",
                relevance: 10
            },
            hljs.APOS_STRING_MODE,
            {
                className: 'regexp',
                begin: /~?\/[^\/\n]+\//,
                contains: [
                    hljs.BACKSLASH_ESCAPE
                ]
            },
            hljs.QUOTE_STRING_MODE,
            {
                className: 'shebang',
                begin: "^#!/usr/bin/env", end: '$',
                illegal: '\n'
            },
            hljs.BINARY_NUMBER_MODE,
            {
                className: 'class',
                beginKeywords: 'class interface trait enum', end: '{',
                illegal: ':',
                contains: [
                    {beginKeywords: 'extends implements'},
                    hljs.UNDERSCORE_TITLE_MODE,
                ]
            },
            hljs.C_NUMBER_MODE,
            {
                className: 'annotation', begin: '@[A-Za-z]+'
            },
            {
                // highlight map keys and named parameters as strings
                className: 'string', begin: /[^\?]{0}[A-Za-z0-9_$]+ *:/
            },
            {
                // catch middle element of the ternary operator
                // to avoid highlight it as a label, named parameter, or map key
                begin: /\?/, end: /\:/
            },
            {
                // highlight labeled statements
                className: 'label', begin: '^\\s*[A-Za-z0-9_$]+:',
                relevance: 0
            },
        ]
    }
};
},{}],60:[function(require,module,exports){
module.exports = // TODO support filter tags like :javascript, support inline HTML
function(hljs) {
  return {
    case_insensitive: true,
    contains: [
      {
        className: 'doctype',
        begin: '^!!!( (5|1\\.1|Strict|Frameset|Basic|Mobile|RDFa|XML\\b.*))?$',
        relevance: 10
      },
      // FIXME these comments should be allowed to span indented lines
      hljs.COMMENT(
        '^\\s*(!=#|=#|-#|/).*$',
        false,
        {
          relevance: 0
        }
      ),
      {
        begin: '^\\s*(-|=|!=)(?!#)',
        starts: {
          end: '\\n',
          subLanguage: 'ruby'
        }
      },
      {
        className: 'tag',
        begin: '^\\s*%',
        contains: [
          {
            className: 'title',
            begin: '\\w+'
          },
          {
            className: 'value',
            begin: '[#\\.][\\w-]+'
          },
          {
            begin: '{\\s*',
            end: '\\s*}',
            excludeEnd: true,
            contains: [
              {
                //className: 'attribute',
                begin: ':\\w+\\s*=>',
                end: ',\\s+',
                returnBegin: true,
                endsWithParent: true,
                contains: [
                  {
                    className: 'symbol',
                    begin: ':\\w+'
                  },
                  hljs.APOS_STRING_MODE,
                  hljs.QUOTE_STRING_MODE,
                  {
                    begin: '\\w+',
                    relevance: 0
                  }
                ]
              }
            ]
          },
          {
            begin: '\\(\\s*',
            end: '\\s*\\)',
            excludeEnd: true,
            contains: [
              {
                //className: 'attribute',
                begin: '\\w+\\s*=',
                end: '\\s+',
                returnBegin: true,
                endsWithParent: true,
                contains: [
                  {
                    className: 'attribute',
                    begin: '\\w+',
                    relevance: 0
                  },
                  hljs.APOS_STRING_MODE,
                  hljs.QUOTE_STRING_MODE,
                  {
                    begin: '\\w+',
                    relevance: 0
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        className: 'bullet',
        begin: '^\\s*[=~]\\s*',
        relevance: 0
      },
      {
        begin: '#{',
        starts: {
          end: '}',
          subLanguage: 'ruby'
        }
      }
    ]
  };
};
},{}],61:[function(require,module,exports){
module.exports = function(hljs) {
  var EXPRESSION_KEYWORDS = 'each in with if else unless bindattr action collection debugger log outlet template unbound view yield';
  return {
    aliases: ['hbs', 'html.hbs', 'html.handlebars'],
    case_insensitive: true,
    subLanguage: 'xml', subLanguageMode: 'continuous',
    contains: [
      {
        className: 'expression',
        begin: '{{', end: '}}',
        contains: [
          {
            className: 'begin-block', begin: '\#[a-zA-Z\-\ \.]+',
            keywords: EXPRESSION_KEYWORDS
          },
          {
            className: 'string',
            begin: '"', end: '"'
          },
          {
            className: 'end-block', begin: '\\\/[a-zA-Z\-\ \.]+',
            keywords: EXPRESSION_KEYWORDS
          },
          {
            className: 'variable', begin: '[a-zA-Z\-\.]+',
            keywords: EXPRESSION_KEYWORDS
          }
        ]
      }
    ]
  };
};
},{}],62:[function(require,module,exports){
module.exports = function(hljs) {
  var COMMENT_MODES = [
    hljs.COMMENT('--', '$'),
    hljs.COMMENT(
      '{-',
      '-}',
      {
        contains: ['self']
      }
    )
  ];

  var PRAGMA = {
    className: 'pragma',
    begin: '{-#', end: '#-}'
  };

  var PREPROCESSOR = {
    className: 'preprocessor',
    begin: '^#', end: '$'
  };

  var CONSTRUCTOR = {
    className: 'type',
    begin: '\\b[A-Z][\\w\']*', // TODO: other constructors (build-in, infix).
    relevance: 0
  };

  var LIST = {
    className: 'container',
    begin: '\\(', end: '\\)',
    illegal: '"',
    contains: [
      PRAGMA,
      PREPROCESSOR,
      {className: 'type', begin: '\\b[A-Z][\\w]*(\\((\\.\\.|,|\\w+)\\))?'},
      hljs.inherit(hljs.TITLE_MODE, {begin: '[_a-z][\\w\']*'})
    ].concat(COMMENT_MODES)
  };

  var RECORD = {
    className: 'container',
    begin: '{', end: '}',
    contains: LIST.contains
  };

  return {
    aliases: ['hs'],
    keywords:
      'let in if then else case of where do module import hiding ' +
      'qualified type data newtype deriving class instance as default ' +
      'infix infixl infixr foreign export ccall stdcall cplusplus ' +
      'jvm dotnet safe unsafe family forall mdo proc rec',
    contains: [

      // Top-level constructions.

      {
        className: 'module',
        begin: '\\bmodule\\b', end: 'where',
        keywords: 'module where',
        contains: [LIST].concat(COMMENT_MODES),
        illegal: '\\W\\.|;'
      },
      {
        className: 'import',
        begin: '\\bimport\\b', end: '$',
        keywords: 'import|0 qualified as hiding',
        contains: [LIST].concat(COMMENT_MODES),
        illegal: '\\W\\.|;'
      },

      {
        className: 'class',
        begin: '^(\\s*)?(class|instance)\\b', end: 'where',
        keywords: 'class family instance where',
        contains: [CONSTRUCTOR, LIST].concat(COMMENT_MODES)
      },
      {
        className: 'typedef',
        begin: '\\b(data|(new)?type)\\b', end: '$',
        keywords: 'data family type newtype deriving',
        contains: [PRAGMA, CONSTRUCTOR, LIST, RECORD].concat(COMMENT_MODES)
      },
      {
        className: 'default',
        beginKeywords: 'default', end: '$',
        contains: [CONSTRUCTOR, LIST].concat(COMMENT_MODES)
      },
      {
        className: 'infix',
        beginKeywords: 'infix infixl infixr', end: '$',
        contains: [hljs.C_NUMBER_MODE].concat(COMMENT_MODES)
      },
      {
        className: 'foreign',
        begin: '\\bforeign\\b', end: '$',
        keywords: 'foreign import export ccall stdcall cplusplus jvm ' +
                  'dotnet safe unsafe',
        contains: [CONSTRUCTOR, hljs.QUOTE_STRING_MODE].concat(COMMENT_MODES)
      },
      {
        className: 'shebang',
        begin: '#!\\/usr\\/bin\\/env\ runhaskell', end: '$'
      },

      // "Whitespaces".

      PRAGMA,
      PREPROCESSOR,

      // Literals and names.

      // TODO: characters.
      hljs.QUOTE_STRING_MODE,
      hljs.C_NUMBER_MODE,
      CONSTRUCTOR,
      hljs.inherit(hljs.TITLE_MODE, {begin: '^[_a-z][\\w\']*'}),

      {begin: '->|<-'} // No markup, relevance booster
    ].concat(COMMENT_MODES)
  };
};
},{}],63:[function(require,module,exports){
module.exports = function(hljs) {
  var IDENT_RE = '[a-zA-Z_$][a-zA-Z0-9_$]*';
  var IDENT_FUNC_RETURN_TYPE_RE = '([*]|[a-zA-Z_$][a-zA-Z0-9_$]*)';

  return {
    aliases: ['hx'],
    keywords: {
      keyword: 'break callback case cast catch class continue default do dynamic else enum extends extern ' +
    'for function here if implements import in inline interface never new override package private ' +
    'public return static super switch this throw trace try typedef untyped using var while',
      literal: 'true false null'
    },
    contains: [
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE,
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      hljs.C_NUMBER_MODE,
      {
        className: 'class',
        beginKeywords: 'class interface', end: '{', excludeEnd: true,
        contains: [
          {
            beginKeywords: 'extends implements'
          },
          hljs.TITLE_MODE
        ]
      },
      {
        className: 'preprocessor',
        begin: '#', end: '$',
        keywords: 'if else elseif end error'
      },
      {
        className: 'function',
        beginKeywords: 'function', end: '[{;]', excludeEnd: true,
        illegal: '\\S',
        contains: [
          hljs.TITLE_MODE,
          {
            className: 'params',
            begin: '\\(', end: '\\)',
            contains: [
              hljs.APOS_STRING_MODE,
              hljs.QUOTE_STRING_MODE,
              hljs.C_LINE_COMMENT_MODE,
              hljs.C_BLOCK_COMMENT_MODE
            ]
          },
          {
            className: 'type',
            begin: ':',
            end: IDENT_FUNC_RETURN_TYPE_RE,
            relevance: 10
          }
        ]
      }
    ]
  };
};
},{}],64:[function(require,module,exports){
module.exports = function(hljs) {
  return {
    aliases: ['https'],
    illegal: '\\S',
    contains: [
      {
        className: 'status',
        begin: '^HTTP/[0-9\\.]+', end: '$',
        contains: [{className: 'number', begin: '\\b\\d{3}\\b'}]
      },
      {
        className: 'request',
        begin: '^[A-Z]+ (.*?) HTTP/[0-9\\.]+$', returnBegin: true, end: '$',
        contains: [
          {
            className: 'string',
            begin: ' ', end: ' ',
            excludeBegin: true, excludeEnd: true
          }
        ]
      },
      {
        className: 'attribute',
        begin: '^\\w', end: ': ', excludeEnd: true,
        illegal: '\\n|\\s|=',
        starts: {className: 'string', end: '$'}
      },
      {
        begin: '\\n\\n',
        starts: {subLanguage: '', endsWithParent: true}
      }
    ]
  };
};
},{}],65:[function(require,module,exports){
module.exports = function(hljs) {
  var START_BRACKET = '\\[';
  var END_BRACKET = '\\]';
  return {
    aliases: ['i7'],
    case_insensitive: true,
    keywords: {
      // Some keywords more or less unique to I7, for relevance.
      keyword:
        // kind:
        'thing|10 room|10 person|10 man|10 woman|10 animal|10 container ' +
        'supporter|10 backdrop|10 door|10 ' +
        // characteristic:
        'scenery|10 open closed|10 locked|10 inside|10 gender|10 ' +
        // verb:
        'is are say|10 understand|10 ' +
        // misc keyword:
        'kind|10 of rule|10'
    },
    contains: [
      {
        className: 'string',
        begin: '"', end: '"',
        relevance: 0,
        contains: [
          {
            className: 'subst',
            begin: START_BRACKET, end: END_BRACKET
          }
        ]
      },
      {
        className: 'title',
        beginKeywords: '^Volume ^Book ^Part ^Chapter ^Section',
        end: '$',
        relevance: 10
      },
      {
        // Table
        className: 'title',
        beginKeywords: '^Table',
        end: '$',
        relevance: 10
      },
      {
        // Rule definition
        // This is here for relevance.
        begin: '^\\b(Check|Carry out|Report|Instead of|To|Rule|When|Before|After)',
        end: ':',
        contains: [
          {
            //Rule name
            begin: '\\b\\(This',
            end: '\\)',
            relevance: 10
          }
        ],
        relevance: 10
      },
      {
        className: 'comment',
        begin: START_BRACKET, end: END_BRACKET,
        contains: ['self']
      }
    ]
  };
};
},{}],66:[function(require,module,exports){
module.exports = function(hljs) {
  return {
    case_insensitive: true,
    illegal: /\S/,
    contains: [
      hljs.COMMENT(';', '$'),
      {
        className: 'title',
        begin: '^\\[', end: '\\]'
      },
      {
        className: 'setting',
        begin: '^[a-z0-9\\[\\]_-]+[ \\t]*=[ \\t]*', end: '$',
        contains: [
          {
            className: 'value',
            endsWithParent: true,
            keywords: 'on off true false yes no',
            contains: [hljs.QUOTE_STRING_MODE, hljs.NUMBER_MODE],
            relevance: 0
          }
        ]
      }
    ]
  };
};
},{}],67:[function(require,module,exports){
module.exports = function(hljs) {
  var GENERIC_IDENT_RE = hljs.UNDERSCORE_IDENT_RE + '(<' + hljs.UNDERSCORE_IDENT_RE + '>)?';
  var KEYWORDS =
    'false synchronized int abstract float private char boolean static null if const ' +
    'for true while long strictfp finally protected import native final void ' +
    'enum else break transient catch instanceof byte super volatile case assert short ' +
    'package default double public try this switch continue throws protected public private';

  // https://docs.oracle.com/javase/7/docs/technotes/guides/language/underscores-literals.html
  var JAVA_NUMBER_RE = '\\b' +
    '(' +
      '0[bB]([01]+[01_]+[01]+|[01]+)' + // 0b...
      '|' +
      '0[xX]([a-fA-F0-9]+[a-fA-F0-9_]+[a-fA-F0-9]+|[a-fA-F0-9]+)' + // 0x...
      '|' +
      '(' +
        '([\\d]+[\\d_]+[\\d]+|[\\d]+)(\\.([\\d]+[\\d_]+[\\d]+|[\\d]+))?' +
        '|' +
        '\\.([\\d]+[\\d_]+[\\d]+|[\\d]+)' +
      ')' +
      '([eE][-+]?\\d+)?' + // octal, decimal, float
    ')' +
    '[lLfF]?';
  var JAVA_NUMBER_MODE = {
    className: 'number',
    begin: JAVA_NUMBER_RE,
    relevance: 0
  };

  return {
    aliases: ['jsp'],
    keywords: KEYWORDS,
    illegal: /<\//,
    contains: [
      hljs.COMMENT(
        '/\\*\\*',
        '\\*/',
        {
          relevance : 0,
          contains : [{
            className : 'doctag',
            begin : '@[A-Za-z]+'
          }]
        }
      ),
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE,
      {
        className: 'class',
        beginKeywords: 'class interface', end: /[{;=]/, excludeEnd: true,
        keywords: 'class interface',
        illegal: /[:"\[\]]/,
        contains: [
          {beginKeywords: 'extends implements'},
          hljs.UNDERSCORE_TITLE_MODE
        ]
      },
      {
        // Expression keywords prevent 'keyword Name(...)' from being
        // recognized as a function definition
        beginKeywords: 'new throw return else',
        relevance: 0
      },
      {
        className: 'function',
        begin: '(' + GENERIC_IDENT_RE + '\\s+)+' + hljs.UNDERSCORE_IDENT_RE + '\\s*\\(', returnBegin: true, end: /[{;=]/,
        excludeEnd: true,
        keywords: KEYWORDS,
        contains: [
          {
            begin: hljs.UNDERSCORE_IDENT_RE + '\\s*\\(', returnBegin: true,
            relevance: 0,
            contains: [hljs.UNDERSCORE_TITLE_MODE]
          },
          {
            className: 'params',
            begin: /\(/, end: /\)/,
            keywords: KEYWORDS,
            relevance: 0,
            contains: [
              hljs.APOS_STRING_MODE,
              hljs.QUOTE_STRING_MODE,
              hljs.C_NUMBER_MODE,
              hljs.C_BLOCK_COMMENT_MODE
            ]
          },
          hljs.C_LINE_COMMENT_MODE,
          hljs.C_BLOCK_COMMENT_MODE
        ]
      },
      JAVA_NUMBER_MODE,
      {
        className: 'annotation', begin: '@[A-Za-z]+'
      }
    ]
  };
};
},{}],68:[function(require,module,exports){
module.exports = function(hljs) {
  return {
    aliases: ['js'],
    keywords: {
      keyword:
        'in of if for while finally var new function do return void else break catch ' +
        'instanceof with throw case default try this switch continue typeof delete ' +
        'let yield const export super debugger as async await',
      literal:
        'true false null undefined NaN Infinity',
      built_in:
        'eval isFinite isNaN parseFloat parseInt decodeURI decodeURIComponent ' +
        'encodeURI encodeURIComponent escape unescape Object Function Boolean Error ' +
        'EvalError InternalError RangeError ReferenceError StopIteration SyntaxError ' +
        'TypeError URIError Number Math Date String RegExp Array Float32Array ' +
        'Float64Array Int16Array Int32Array Int8Array Uint16Array Uint32Array ' +
        'Uint8Array Uint8ClampedArray ArrayBuffer DataView JSON Intl arguments require ' +
        'module console window document Symbol Set Map WeakSet WeakMap Proxy Reflect ' +
        'Promise'
    },
    contains: [
      {
        className: 'pi',
        relevance: 10,
        begin: /^\s*['"]use (strict|asm)['"]/
      },
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE,
      { // template string
        className: 'string',
        begin: '`', end: '`',
        contains: [
          hljs.BACKSLASH_ESCAPE,
          {
            className: 'subst',
            begin: '\\$\\{', end: '\\}'
          }
        ]
      },
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      {
        className: 'number',
        variants: [
          { begin: '\\b(0[bB][01]+)' },
          { begin: '\\b(0[oO][0-7]+)' },
          { begin: hljs.C_NUMBER_RE }
        ],
        relevance: 0
      },
      { // "value" container
        begin: '(' + hljs.RE_STARTERS_RE + '|\\b(case|return|throw)\\b)\\s*',
        keywords: 'return throw case',
        contains: [
          hljs.C_LINE_COMMENT_MODE,
          hljs.C_BLOCK_COMMENT_MODE,
          hljs.REGEXP_MODE,
          { // E4X / JSX
            begin: /</, end: />\s*[);\]]/,
            relevance: 0,
            subLanguage: 'xml'
          }
        ],
        relevance: 0
      },
      {
        className: 'function',
        beginKeywords: 'function', end: /\{/, excludeEnd: true,
        contains: [
          hljs.inherit(hljs.TITLE_MODE, {begin: /[A-Za-z$_][0-9A-Za-z$_]*/}),
          {
            className: 'params',
            begin: /\(/, end: /\)/,
            excludeBegin: true,
            excludeEnd: true,
            contains: [
              hljs.C_LINE_COMMENT_MODE,
              hljs.C_BLOCK_COMMENT_MODE
            ],
            illegal: /["'\(]/
          }
        ],
        illegal: /\[|%/
      },
      {
        begin: /\$[(.]/ // relevance booster for a pattern common to JS libs: `$(something)` and `$.something`
      },
      {
        begin: '\\.' + hljs.IDENT_RE, relevance: 0 // hack: prevents detection of keywords after dots
      },
      // ECMAScript 6 modules import
      {
        beginKeywords: 'import', end: '[;$]',
        keywords: 'import from as',
        contains: [
          hljs.APOS_STRING_MODE,
          hljs.QUOTE_STRING_MODE
        ]
      },
      { // ES6 class
        className: 'class',
        beginKeywords: 'class', end: /[{;=]/, excludeEnd: true,
        illegal: /[:"\[\]]/,
        contains: [
          {beginKeywords: 'extends'},
          hljs.UNDERSCORE_TITLE_MODE
        ]
      }
    ]
  };
};
},{}],69:[function(require,module,exports){
module.exports = function(hljs) {
  var LITERALS = {literal: 'true false null'};
  var TYPES = [
    hljs.QUOTE_STRING_MODE,
    hljs.C_NUMBER_MODE
  ];
  var VALUE_CONTAINER = {
    className: 'value',
    end: ',', endsWithParent: true, excludeEnd: true,
    contains: TYPES,
    keywords: LITERALS
  };
  var OBJECT = {
    begin: '{', end: '}',
    contains: [
      {
        className: 'attribute',
        begin: '\\s*"', end: '"\\s*:\\s*', excludeBegin: true, excludeEnd: true,
        contains: [hljs.BACKSLASH_ESCAPE],
        illegal: '\\n',
        starts: VALUE_CONTAINER
      }
    ],
    illegal: '\\S'
  };
  var ARRAY = {
    begin: '\\[', end: '\\]',
    contains: [hljs.inherit(VALUE_CONTAINER, {className: null})], // inherit is also a workaround for a bug that makes shared modes with endsWithParent compile only the ending of one of the parents
    illegal: '\\S'
  };
  TYPES.splice(TYPES.length, 0, OBJECT, ARRAY);
  return {
    contains: TYPES,
    keywords: LITERALS,
    illegal: '\\S'
  };
};
},{}],70:[function(require,module,exports){
module.exports = function(hljs) {
  // Since there are numerous special names in Julia, it is too much trouble
  // to maintain them by hand. Hence these names (i.e. keywords, literals and
  // built-ins) are automatically generated from Julia (v0.3.0) itself through
  // following scripts for each.

  var KEYWORDS = {
    // # keyword generator
    // println("\"in\",")
    // for kw in Base.REPLCompletions.complete_keyword("")
    //     println("\"$kw\",")
    // end
    keyword:
      'in abstract baremodule begin bitstype break catch ccall const continue do else elseif end export ' +
      'finally for function global if immutable import importall let local macro module quote return try type ' +
      'typealias using while',

    // # literal generator
    // println("\"true\",\n\"false\"")
    // for name in Base.REPLCompletions.completions("", 0)[1]
    //     try
    //         s = symbol(name)
    //         v = eval(s)
    //         if !isa(v, Function) &&
    //            !isa(v, DataType) &&
    //            !issubtype(typeof(v), Tuple) &&
    //            !isa(v, UnionType) &&
    //            !isa(v, Module) &&
    //            !isa(v, TypeConstructor) &&
    //            !isa(v, Colon)
    //             println("\"$name\",")
    //         end
    //     end
    // end
    literal:
      'true false ANY ARGS CPU_CORES C_NULL DL_LOAD_PATH DevNull ENDIAN_BOM ENV I|0 Inf Inf16 Inf32 ' +
      'InsertionSort JULIA_HOME LOAD_PATH MS_ASYNC MS_INVALIDATE MS_SYNC MergeSort NaN NaN16 NaN32 OS_NAME QuickSort ' +
      'RTLD_DEEPBIND RTLD_FIRST RTLD_GLOBAL RTLD_LAZY RTLD_LOCAL RTLD_NODELETE RTLD_NOLOAD RTLD_NOW RoundDown ' +
      'RoundFromZero RoundNearest RoundToZero RoundUp STDERR STDIN STDOUT VERSION WORD_SIZE catalan cglobal e eu ' +
      'eulergamma golden im nothing pi γ π φ',

    // # built_in generator:
    // for name in Base.REPLCompletions.completions("", 0)[1]
    //     try
    //         v = eval(symbol(name))
    //         if isa(v, DataType)
    //             println("\"$name\",")
    //         end
    //     end
    // end
    built_in:
      'ASCIIString AbstractArray AbstractRNG AbstractSparseArray Any ArgumentError Array Associative Base64Pipe ' +
      'Bidiagonal BigFloat BigInt BitArray BitMatrix BitVector Bool BoundsError Box CFILE Cchar Cdouble Cfloat Char ' +
      'CharString Cint Clong Clonglong ClusterManager Cmd Coff_t Colon Complex Complex128 Complex32 Complex64 ' +
      'Condition Cptrdiff_t Cshort Csize_t Cssize_t Cuchar Cuint Culong Culonglong Cushort Cwchar_t DArray DataType ' +
      'DenseArray Diagonal Dict DimensionMismatch DirectIndexString Display DivideError DomainError EOFError ' +
      'EachLine Enumerate ErrorException Exception Expr Factorization FileMonitor FileOffset Filter Float16 Float32 ' +
      'Float64 FloatRange FloatingPoint Function GetfieldNode GotoNode Hermitian IO IOBuffer IOStream IPv4 IPv6 ' +
      'InexactError Int Int128 Int16 Int32 Int64 Int8 IntSet Integer InterruptException IntrinsicFunction KeyError ' +
      'LabelNode LambdaStaticData LineNumberNode LoadError LocalProcess MIME MathConst MemoryError MersenneTwister ' +
      'Method MethodError MethodTable Module NTuple NewvarNode Nothing Number ObjectIdDict OrdinalRange ' +
      'OverflowError ParseError PollingFileWatcher ProcessExitedException ProcessGroup Ptr QuoteNode Range Range1 ' +
      'Ranges Rational RawFD Real Regex RegexMatch RemoteRef RepString RevString RopeString RoundingMode Set ' +
      'SharedArray Signed SparseMatrixCSC StackOverflowError Stat StatStruct StepRange String SubArray SubString ' +
      'SymTridiagonal Symbol SymbolNode Symmetric SystemError Task TextDisplay Timer TmStruct TopNode Triangular ' +
      'Tridiagonal Type TypeConstructor TypeError TypeName TypeVar UTF16String UTF32String UTF8String UdpSocket ' +
      'Uint Uint128 Uint16 Uint32 Uint64 Uint8 UndefRefError UndefVarError UniformScaling UnionType UnitRange ' +
      'Unsigned Vararg VersionNumber WString WeakKeyDict WeakRef Woodbury Zip'
  };

  // ref: http://julia.readthedocs.org/en/latest/manual/variables/#allowed-variable-names
  var VARIABLE_NAME_RE = "[A-Za-z_\\u00A1-\\uFFFF][A-Za-z_0-9\\u00A1-\\uFFFF]*";

  // placeholder for recursive self-reference
  var DEFAULT = { lexemes: VARIABLE_NAME_RE, keywords: KEYWORDS };

  var TYPE_ANNOTATION = {
    className: "type-annotation",
    begin: /::/
  };

  var SUBTYPE = {
    className: "subtype",
    begin: /<:/
  };

  // ref: http://julia.readthedocs.org/en/latest/manual/integers-and-floating-point-numbers/
  var NUMBER = {
    className: "number",
    // supported numeric literals:
    //  * binary literal (e.g. 0x10)
    //  * octal literal (e.g. 0o76543210)
    //  * hexadecimal literal (e.g. 0xfedcba876543210)
    //  * hexadecimal floating point literal (e.g. 0x1p0, 0x1.2p2)
    //  * decimal literal (e.g. 9876543210, 100_000_000)
    //  * floating pointe literal (e.g. 1.2, 1.2f, .2, 1., 1.2e10, 1.2e-10)
    begin: /(\b0x[\d_]*(\.[\d_]*)?|0x\.\d[\d_]*)p[-+]?\d+|\b0[box][a-fA-F0-9][a-fA-F0-9_]*|(\b\d[\d_]*(\.[\d_]*)?|\.\d[\d_]*)([eEfF][-+]?\d+)?/,
    relevance: 0
  };

  var CHAR = {
    className: "char",
    begin: /'(.|\\[xXuU][a-zA-Z0-9]+)'/
  };

  var INTERPOLATION = {
    className: 'subst',
    begin: /\$\(/, end: /\)/,
    keywords: KEYWORDS
  };

  var INTERPOLATED_VARIABLE = {
    className: 'variable',
    begin: "\\$" + VARIABLE_NAME_RE
  };

  // TODO: neatly escape normal code in string literal
  var STRING = {
    className: "string",
    contains: [hljs.BACKSLASH_ESCAPE, INTERPOLATION, INTERPOLATED_VARIABLE],
    variants: [
      { begin: /\w*"/, end: /"\w*/ },
      { begin: /\w*"""/, end: /"""\w*/ }
    ]
  };

  var COMMAND = {
    className: "string",
    contains: [hljs.BACKSLASH_ESCAPE, INTERPOLATION, INTERPOLATED_VARIABLE],
    begin: '`', end: '`'
  };

  var MACROCALL = {
    className: "macrocall",
    begin: "@" + VARIABLE_NAME_RE
  };

  var COMMENT = {
    className: "comment",
    variants: [
      { begin: "#=", end: "=#", relevance: 10 },
      { begin: '#', end: '$' }
    ]
  };

  DEFAULT.contains = [
    NUMBER,
    CHAR,
    TYPE_ANNOTATION,
    SUBTYPE,
    STRING,
    COMMAND,
    MACROCALL,
    COMMENT,
    hljs.HASH_COMMENT_MODE
  ];
  INTERPOLATION.contains = DEFAULT.contains;

  return DEFAULT;
};
},{}],71:[function(require,module,exports){
module.exports = function (hljs) {
  var KEYWORDS = 'val var get set class trait object public open private protected ' +
    'final enum if else do while for when break continue throw try catch finally ' +
    'import package is as in return fun override default companion reified inline volatile transient native';

  return {
    keywords: {
      typename: 'Byte Short Char Int Long Boolean Float Double Void Unit Nothing',
      literal: 'true false null',
      keyword: KEYWORDS
    },
    contains : [
      hljs.COMMENT(
        '/\\*\\*',
        '\\*/',
        {
          relevance : 0,
          contains : [{
            className : 'doctag',
            begin : '@[A-Za-z]+'
          }]
        }
      ),
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      {
        className: 'type',
        begin: /</, end: />/,
        returnBegin: true,
        excludeEnd: false,
        relevance: 0
      },
      {
        className: 'function',
        beginKeywords: 'fun', end: '[(]|$',
        returnBegin: true,
        excludeEnd: true,
        keywords: KEYWORDS,
        illegal: /fun\s+(<.*>)?[^\s\(]+(\s+[^\s\(]+)\s*=/,
        relevance: 5,
        contains: [
          {
            begin: hljs.UNDERSCORE_IDENT_RE + '\\s*\\(', returnBegin: true,
            relevance: 0,
            contains: [hljs.UNDERSCORE_TITLE_MODE]
          },
          {
            className: 'type',
            begin: /</, end: />/, keywords: 'reified',
            relevance: 0
          },
          {
            className: 'params',
            begin: /\(/, end: /\)/,
            keywords: KEYWORDS,
            relevance: 0,
            illegal: /\([^\(,\s:]+,/,
            contains: [
              {
                className: 'typename',
                begin: /:\s*/, end: /\s*[=\)]/, excludeBegin: true, returnEnd: true,
                relevance: 0
              }
            ]
          },
          hljs.C_LINE_COMMENT_MODE,
          hljs.C_BLOCK_COMMENT_MODE
        ]
      },
      {
        className: 'class',
        beginKeywords: 'class trait', end: /[:\{(]|$/,
        excludeEnd: true,
        illegal: 'extends implements',
        contains: [
          hljs.UNDERSCORE_TITLE_MODE,
          {
            className: 'type',
            begin: /</, end: />/, excludeBegin: true, excludeEnd: true,
            relevance: 0
          },
          {
            className: 'typename',
            begin: /[,:]\s*/, end: /[<\(,]|$/, excludeBegin: true, returnEnd: true
          }
        ]
      },
      {
        className: 'variable', beginKeywords: 'var val', end: /\s*[=:$]/, excludeEnd: true
      },
      hljs.QUOTE_STRING_MODE,
      {
        className: 'shebang',
        begin: "^#!/usr/bin/env", end: '$',
        illegal: '\n'
      },
      hljs.C_NUMBER_MODE
    ]
  };
};
},{}],72:[function(require,module,exports){
module.exports = function(hljs) {
  var LASSO_IDENT_RE = '[a-zA-Z_][a-zA-Z0-9_.]*';
  var LASSO_ANGLE_RE = '<\\?(lasso(script)?|=)';
  var LASSO_CLOSE_RE = '\\]|\\?>';
  var LASSO_KEYWORDS = {
    literal:
      'true false none minimal full all void and or not ' +
      'bw nbw ew new cn ncn lt lte gt gte eq neq rx nrx ft',
    built_in:
      'array date decimal duration integer map pair string tag xml null ' +
      'boolean bytes keyword list locale queue set stack staticarray ' +
      'local var variable global data self inherited',
    keyword:
      'error_code error_msg error_pop error_push error_reset cache ' +
      'database_names database_schemanames database_tablenames define_tag ' +
      'define_type email_batch encode_set html_comment handle handle_error ' +
      'header if inline iterate ljax_target link link_currentaction ' +
      'link_currentgroup link_currentrecord link_detail link_firstgroup ' +
      'link_firstrecord link_lastgroup link_lastrecord link_nextgroup ' +
      'link_nextrecord link_prevgroup link_prevrecord log loop ' +
      'namespace_using output_none portal private protect records referer ' +
      'referrer repeating resultset rows search_args search_arguments ' +
      'select sort_args sort_arguments thread_atomic value_list while ' +
      'abort case else if_empty if_false if_null if_true loop_abort ' +
      'loop_continue loop_count params params_up return return_value ' +
      'run_children soap_definetag soap_lastrequest soap_lastresponse ' +
      'tag_name ascending average by define descending do equals ' +
      'frozen group handle_failure import in into join let match max ' +
      'min on order parent protected provide public require returnhome ' +
      'skip split_thread sum take thread to trait type where with ' +
      'yield yieldhome'
  };
  var HTML_COMMENT = hljs.COMMENT(
    '<!--',
    '-->',
    {
      relevance: 0
    }
  );
  var LASSO_NOPROCESS = {
    className: 'preprocessor',
    begin: '\\[noprocess\\]',
    starts: {
      className: 'markup',
      end: '\\[/noprocess\\]',
      returnEnd: true,
      contains: [HTML_COMMENT]
    }
  };
  var LASSO_START = {
    className: 'preprocessor',
    begin: '\\[/noprocess|' + LASSO_ANGLE_RE
  };
  var LASSO_DATAMEMBER = {
    className: 'variable',
    begin: '\'' + LASSO_IDENT_RE + '\''
  };
  var LASSO_CODE = [
    hljs.COMMENT(
      '/\\*\\*!',
      '\\*/'
    ),
    hljs.C_LINE_COMMENT_MODE,
    hljs.C_BLOCK_COMMENT_MODE,
    hljs.inherit(hljs.C_NUMBER_MODE, {begin: hljs.C_NUMBER_RE + '|(-?infinity|nan)\\b'}),
    hljs.inherit(hljs.APOS_STRING_MODE, {illegal: null}),
    hljs.inherit(hljs.QUOTE_STRING_MODE, {illegal: null}),
    {
      className: 'string',
      begin: '`', end: '`'
    },
    {
      className: 'variable',
      variants: [
        {
          begin: '[#$]' + LASSO_IDENT_RE
        },
        {
          begin: '#', end: '\\d+',
          illegal: '\\W'
        }
      ]
    },
    {
      className: 'tag',
      begin: '::\\s*', end: LASSO_IDENT_RE,
      illegal: '\\W'
    },
    {
      className: 'attribute',
      variants: [
        {
          begin: '-' + hljs.UNDERSCORE_IDENT_RE,
          relevance: 0
        },
        {
          begin: '(\\.\\.\\.)'
        }
      ]
    },
    {
      className: 'subst',
      variants: [
        {
          begin: '->\\s*',
          contains: [LASSO_DATAMEMBER]
        },
        {
          begin: ':=|/(?!\\w)=?|[-+*%=<>&|!?\\\\]+',
          relevance: 0
        }
      ]
    },
    {
      className: 'built_in',
      begin: '\\.\\.?\\s*',
      relevance: 0,
      contains: [LASSO_DATAMEMBER]
    },
    {
      className: 'class',
      beginKeywords: 'define',
      returnEnd: true, end: '\\(|=>',
      contains: [
        hljs.inherit(hljs.TITLE_MODE, {begin: hljs.UNDERSCORE_IDENT_RE + '(=(?!>))?'})
      ]
    }
  ];
  return {
    aliases: ['ls', 'lassoscript'],
    case_insensitive: true,
    lexemes: LASSO_IDENT_RE + '|&[lg]t;',
    keywords: LASSO_KEYWORDS,
    contains: [
      {
        className: 'preprocessor',
        begin: LASSO_CLOSE_RE,
        relevance: 0,
        starts: {
          className: 'markup',
          end: '\\[|' + LASSO_ANGLE_RE,
          returnEnd: true,
          relevance: 0,
          contains: [HTML_COMMENT]
        }
      },
      LASSO_NOPROCESS,
      LASSO_START,
      {
        className: 'preprocessor',
        begin: '\\[no_square_brackets',
        starts: {
          end: '\\[/no_square_brackets\\]', // not implemented in the language
          lexemes: LASSO_IDENT_RE + '|&[lg]t;',
          keywords: LASSO_KEYWORDS,
          contains: [
            {
              className: 'preprocessor',
              begin: LASSO_CLOSE_RE,
              relevance: 0,
              starts: {
                className: 'markup',
                end: '\\[noprocess\\]|' + LASSO_ANGLE_RE,
                returnEnd: true,
                contains: [HTML_COMMENT]
              }
            },
            LASSO_NOPROCESS,
            LASSO_START
          ].concat(LASSO_CODE)
        }
      },
      {
        className: 'preprocessor',
        begin: '\\[',
        relevance: 0
      },
      {
        className: 'shebang',
        begin: '^#!.+lasso9\\b',
        relevance: 10
      }
    ].concat(LASSO_CODE)
  };
};
},{}],73:[function(require,module,exports){
module.exports = function(hljs) {
  var IDENT_RE        = '[\\w-]+'; // yes, Less identifiers may begin with a digit
  var INTERP_IDENT_RE = '(' + IDENT_RE + '|@{' + IDENT_RE + '})';

  /* Generic Modes */

  var RULES = [], VALUE = []; // forward def. for recursive modes

  var STRING_MODE = function(c) { return {
    // Less strings are not multiline (also include '~' for more consistent coloring of "escaped" strings)
    className: 'string', begin: '~?' + c + '.*?' + c
  };};

  var IDENT_MODE = function(name, begin, relevance) { return {
    className: name, begin: begin, relevance: relevance
  };};

  var FUNCT_MODE = function(name, ident, obj) {
    return hljs.inherit({
        className: name, begin: ident + '\\(', end: '\\(',
        returnBegin: true, excludeEnd: true, relevance: 0
    }, obj);
  };

  var PARENS_MODE = {
    // used only to properly balance nested parens inside mixin call, def. arg list
    begin: '\\(', end: '\\)', contains: VALUE, relevance: 0
  };

  // generic Less highlighter (used almost everywhere except selectors):
  VALUE.push(
    hljs.C_LINE_COMMENT_MODE,
    hljs.C_BLOCK_COMMENT_MODE,
    STRING_MODE("'"),
    STRING_MODE('"'),
    hljs.CSS_NUMBER_MODE, // fixme: it does not include dot for numbers like .5em :(
    IDENT_MODE('hexcolor', '#[0-9A-Fa-f]+\\b'),
    FUNCT_MODE('function', '(url|data-uri)', {
      starts: {className: 'string', end: '[\\)\\n]', excludeEnd: true}
    }),
    FUNCT_MODE('function', IDENT_RE),
    PARENS_MODE,
    IDENT_MODE('variable', '@@?' + IDENT_RE, 10),
    IDENT_MODE('variable', '@{'  + IDENT_RE + '}'),
    IDENT_MODE('built_in', '~?`[^`]*?`'), // inline javascript (or whatever host language) *multiline* string
    { // @media features (it’s here to not duplicate things in AT_RULE_MODE with extra PARENS_MODE overriding):
      className: 'attribute', begin: IDENT_RE + '\\s*:', end: ':', returnBegin: true, excludeEnd: true
    }
  );

  var VALUE_WITH_RULESETS = VALUE.concat({
    begin: '{', end: '}', contains: RULES
  });

  var MIXIN_GUARD_MODE = {
    beginKeywords: 'when', endsWithParent: true,
    contains: [{beginKeywords: 'and not'}].concat(VALUE) // using this form to override VALUE’s 'function' match
  };

  /* Rule-Level Modes */

  var RULE_MODE = {
    className: 'attribute',
    begin: INTERP_IDENT_RE, end: ':', excludeEnd: true,
    contains: [hljs.C_LINE_COMMENT_MODE, hljs.C_BLOCK_COMMENT_MODE],
    illegal: /\S/,
    starts: {end: '[;}]', returnEnd: true, contains: VALUE, illegal: '[<=$]'}
  };

  var AT_RULE_MODE = {
    className: 'at_rule', // highlight only at-rule keyword
    begin: '@(import|media|charset|font-face|(-[a-z]+-)?keyframes|supports|document|namespace|page|viewport|host)\\b',
    starts: {end: '[;{}]', returnEnd: true, contains: VALUE, relevance: 0}
  };

  // variable definitions and calls
  var VAR_RULE_MODE = {
    className: 'variable',
    variants: [
      // using more strict pattern for higher relevance to increase chances of Less detection.
      // this is *the only* Less specific statement used in most of the sources, so...
      // (we’ll still often loose to the css-parser unless there's '//' comment,
      // simply because 1 variable just can't beat 99 properties :)
      {begin: '@' + IDENT_RE + '\\s*:', relevance: 15},
      {begin: '@' + IDENT_RE}
    ],
    starts: {end: '[;}]', returnEnd: true, contains: VALUE_WITH_RULESETS}
  };

  var SELECTOR_MODE = {
    // first parse unambiguous selectors (i.e. those not starting with tag)
    // then fall into the scary lookahead-discriminator variant.
    // this mode also handles mixin definitions and calls
    variants: [{
      begin: '[\\.#:&\\[]', end: '[;{}]'  // mixin calls end with ';'
      }, {
      begin: INTERP_IDENT_RE + '[^;]*{',
      end: '{'
    }],
    returnBegin: true,
    returnEnd:   true,
    illegal: '[<=\'$"]',
    contains: [
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      MIXIN_GUARD_MODE,
      IDENT_MODE('keyword',  'all\\b'),
      IDENT_MODE('variable', '@{'  + IDENT_RE + '}'),     // otherwise it’s identified as tag
      IDENT_MODE('tag',       INTERP_IDENT_RE + '%?', 0), // '%' for more consistent coloring of @keyframes "tags"
      IDENT_MODE('id',       '#'   + INTERP_IDENT_RE),
      IDENT_MODE('class',    '\\.' + INTERP_IDENT_RE, 0),
      IDENT_MODE('keyword',  '&', 0),
      FUNCT_MODE('pseudo',   ':not'),
      FUNCT_MODE('keyword',  ':extend'),
      IDENT_MODE('pseudo',   '::?' + INTERP_IDENT_RE),
      {className: 'attr_selector', begin: '\\[', end: '\\]'},
      {begin: '\\(', end: '\\)', contains: VALUE_WITH_RULESETS}, // argument list of parametric mixins
      {begin: '!important'} // eat !important after mixin call or it will be colored as tag
    ]
  };

  RULES.push(
    hljs.C_LINE_COMMENT_MODE,
    hljs.C_BLOCK_COMMENT_MODE,
    AT_RULE_MODE,
    VAR_RULE_MODE,
    SELECTOR_MODE,
    RULE_MODE
  );

  return {
    case_insensitive: true,
    illegal: '[=>\'/<($"]',
    contains: RULES
  };
};
},{}],74:[function(require,module,exports){
module.exports = function(hljs) {
  var LISP_IDENT_RE = '[a-zA-Z_\\-\\+\\*\\/\\<\\=\\>\\&\\#][a-zA-Z0-9_\\-\\+\\*\\/\\<\\=\\>\\&\\#!]*';
  var MEC_RE = '\\|[^]*?\\|';
  var LISP_SIMPLE_NUMBER_RE = '(\\-|\\+)?\\d+(\\.\\d+|\\/\\d+)?((d|e|f|l|s|D|E|F|L|S)(\\+|\\-)?\\d+)?';
  var SHEBANG = {
    className: 'shebang',
    begin: '^#!', end: '$'
  };
  var LITERAL = {
    className: 'literal',
    begin: '\\b(t{1}|nil)\\b'
  };
  var NUMBER = {
    className: 'number',
    variants: [
      {begin: LISP_SIMPLE_NUMBER_RE, relevance: 0},
      {begin: '#(b|B)[0-1]+(/[0-1]+)?'},
      {begin: '#(o|O)[0-7]+(/[0-7]+)?'},
      {begin: '#(x|X)[0-9a-fA-F]+(/[0-9a-fA-F]+)?'},
      {begin: '#(c|C)\\(' + LISP_SIMPLE_NUMBER_RE + ' +' + LISP_SIMPLE_NUMBER_RE, end: '\\)'}
    ]
  };
  var STRING = hljs.inherit(hljs.QUOTE_STRING_MODE, {illegal: null});
  var COMMENT = hljs.COMMENT(
    ';', '$',
    {
      relevance: 0
    }
  );
  var VARIABLE = {
    className: 'variable',
    begin: '\\*', end: '\\*'
  };
  var KEYWORD = {
    className: 'keyword',
    begin: '[:&]' + LISP_IDENT_RE
  };
  var IDENT = {
    begin: LISP_IDENT_RE,
    relevance: 0
  };
  var MEC = {
    begin: MEC_RE
  };
  var QUOTED_LIST = {
    begin: '\\(', end: '\\)',
    contains: ['self', LITERAL, STRING, NUMBER, IDENT]
  };
  var QUOTED = {
    className: 'quoted',
    contains: [NUMBER, STRING, VARIABLE, KEYWORD, QUOTED_LIST, IDENT],
    variants: [
      {
        begin: '[\'`]\\(', end: '\\)'
      },
      {
        begin: '\\(quote ', end: '\\)',
        keywords: 'quote'
      },
      {
        begin: '\'' + MEC_RE
      }
    ]
  };
  var QUOTED_ATOM = {
    className: 'quoted',
    variants: [
      {begin: '\'' + LISP_IDENT_RE},
      {begin: '#\'' + LISP_IDENT_RE + '(::' + LISP_IDENT_RE + ')*'}
    ]
  };
  var LIST = {
    className: 'list',
    begin: '\\(\\s*', end: '\\)'
  };
  var BODY = {
    endsWithParent: true,
    relevance: 0
  };
  LIST.contains = [
    {
      className: 'keyword',
      variants: [
        {begin: LISP_IDENT_RE},
        {begin: MEC_RE}
      ]
    },
    BODY
  ];
  BODY.contains = [QUOTED, QUOTED_ATOM, LIST, LITERAL, NUMBER, STRING, COMMENT, VARIABLE, KEYWORD, MEC, IDENT];

  return {
    illegal: /\S/,
    contains: [
      NUMBER,
      SHEBANG,
      LITERAL,
      STRING,
      COMMENT,
      QUOTED,
      QUOTED_ATOM,
      LIST,
      IDENT
    ]
  };
};
},{}],75:[function(require,module,exports){
module.exports = function(hljs) {
  var VARIABLE = {
    className: 'variable', begin: '\\b[gtps][A-Z]+[A-Za-z0-9_\\-]*\\b|\\$_[A-Z]+',
    relevance: 0
  };
  var COMMENT_MODES = [
    hljs.C_BLOCK_COMMENT_MODE,
    hljs.HASH_COMMENT_MODE,
    hljs.COMMENT('--', '$'),
    hljs.COMMENT('[^:]//', '$')
  ];
  var TITLE1 = hljs.inherit(hljs.TITLE_MODE, {
    variants: [
      {begin: '\\b_*rig[A-Z]+[A-Za-z0-9_\\-]*'},
      {begin: '\\b_[a-z0-9\\-]+'}
    ]
  });
  var TITLE2 = hljs.inherit(hljs.TITLE_MODE, {begin: '\\b([A-Za-z0-9_\\-]+)\\b'});
  return {
    case_insensitive: false,
    keywords: {
      keyword:
        '$_COOKIE $_FILES $_GET $_GET_BINARY $_GET_RAW $_POST $_POST_BINARY $_POST_RAW $_SESSION $_SERVER ' +
        'codepoint codepoints segment segments codeunit codeunits sentence sentences trueWord trueWords paragraph ' +
        'after byte bytes english the until http forever descending using line real8 with seventh ' +
        'for stdout finally element word words fourth before black ninth sixth characters chars stderr ' +
        'uInt1 uInt1s uInt2 uInt2s stdin string lines relative rel any fifth items from middle mid ' +
        'at else of catch then third it file milliseconds seconds second secs sec int1 int1s int4 ' +
        'int4s internet int2 int2s normal text item last long detailed effective uInt4 uInt4s repeat ' +
        'end repeat URL in try into switch to words https token binfile each tenth as ticks tick ' +
        'system real4 by dateItems without char character ascending eighth whole dateTime numeric short ' +
        'first ftp integer abbreviated abbr abbrev private case while if',
      constant:
        'SIX TEN FORMFEED NINE ZERO NONE SPACE FOUR FALSE COLON CRLF PI COMMA ENDOFFILE EOF EIGHT FIVE ' +
        'QUOTE EMPTY ONE TRUE RETURN CR LINEFEED RIGHT BACKSLASH NULL SEVEN TAB THREE TWO ' +
        'six ten formfeed nine zero none space four false colon crlf pi comma endoffile eof eight five ' +
        'quote empty one true return cr linefeed right backslash null seven tab three two ' +
        'RIVERSION RISTATE FILE_READ_MODE FILE_WRITE_MODE FILE_WRITE_MODE DIR_WRITE_MODE FILE_READ_UMASK ' +
        'FILE_WRITE_UMASK DIR_READ_UMASK DIR_WRITE_UMASK',
      operator:
        'div mod wrap and or bitAnd bitNot bitOr bitXor among not in a an within ' +
        'contains ends with begins the keys of keys',
      built_in:
        'put abs acos aliasReference annuity arrayDecode arrayEncode asin atan atan2 average avg avgDev base64Decode ' +
        'base64Encode baseConvert binaryDecode binaryEncode byteOffset byteToNum cachedURL cachedURLs charToNum ' +
        'cipherNames codepointOffset codepointProperty codepointToNum codeunitOffset commandNames compound compress ' +
        'constantNames cos date dateFormat decompress directories ' +
        'diskSpace DNSServers exp exp1 exp2 exp10 extents files flushEvents folders format functionNames geometricMean global ' +
        'globals hasMemory harmonicMean hostAddress hostAddressToName hostName hostNameToAddress isNumber ISOToMac itemOffset ' +
        'keys len length libURLErrorData libUrlFormData libURLftpCommand libURLLastHTTPHeaders libURLLastRHHeaders ' +
        'libUrlMultipartFormAddPart libUrlMultipartFormData libURLVersion lineOffset ln ln1 localNames log log2 log10 ' +
        'longFilePath lower macToISO matchChunk matchText matrixMultiply max md5Digest median merge millisec ' +
        'millisecs millisecond milliseconds min monthNames nativeCharToNum normalizeText num number numToByte numToChar ' +
        'numToCodepoint numToNativeChar offset open openfiles openProcesses openProcessIDs openSockets ' +
        'paragraphOffset paramCount param params peerAddress pendingMessages platform popStdDev populationStandardDeviation ' +
        'populationVariance popVariance processID random randomBytes replaceText result revCreateXMLTree revCreateXMLTreeFromFile ' +
        'revCurrentRecord revCurrentRecordIsFirst revCurrentRecordIsLast revDatabaseColumnCount revDatabaseColumnIsNull ' +
        'revDatabaseColumnLengths revDatabaseColumnNames revDatabaseColumnNamed revDatabaseColumnNumbered ' +
        'revDatabaseColumnTypes revDatabaseConnectResult revDatabaseCursors revDatabaseID revDatabaseTableNames ' +
        'revDatabaseType revDataFromQuery revdb_closeCursor revdb_columnbynumber revdb_columncount revdb_columnisnull ' +
        'revdb_columnlengths revdb_columnnames revdb_columntypes revdb_commit revdb_connect revdb_connections ' +
        'revdb_connectionerr revdb_currentrecord revdb_cursorconnection revdb_cursorerr revdb_cursors revdb_dbtype ' +
        'revdb_disconnect revdb_execute revdb_iseof revdb_isbof revdb_movefirst revdb_movelast revdb_movenext ' +
        'revdb_moveprev revdb_query revdb_querylist revdb_recordcount revdb_rollback revdb_tablenames ' +
        'revGetDatabaseDriverPath revNumberOfRecords revOpenDatabase revOpenDatabases revQueryDatabase ' +
        'revQueryDatabaseBlob revQueryResult revQueryIsAtStart revQueryIsAtEnd revUnixFromMacPath revXMLAttribute ' +
        'revXMLAttributes revXMLAttributeValues revXMLChildContents revXMLChildNames revXMLCreateTreeFromFileWithNamespaces ' +
        'revXMLCreateTreeWithNamespaces revXMLDataFromXPathQuery revXMLEvaluateXPath revXMLFirstChild revXMLMatchingNode ' +
        'revXMLNextSibling revXMLNodeContents revXMLNumberOfChildren revXMLParent revXMLPreviousSibling ' +
        'revXMLRootNode revXMLRPC_CreateRequest revXMLRPC_Documents revXMLRPC_Error ' +
        'revXMLRPC_GetHost revXMLRPC_GetMethod revXMLRPC_GetParam revXMLText revXMLRPC_Execute ' +
        'revXMLRPC_GetParamCount revXMLRPC_GetParamNode revXMLRPC_GetParamType revXMLRPC_GetPath revXMLRPC_GetPort ' +
        'revXMLRPC_GetProtocol revXMLRPC_GetRequest revXMLRPC_GetResponse revXMLRPC_GetSocket revXMLTree ' +
        'revXMLTrees revXMLValidateDTD revZipDescribeItem revZipEnumerateItems revZipOpenArchives round sampVariance ' +
        'sec secs seconds sentenceOffset sha1Digest shell shortFilePath sin specialFolderPath sqrt standardDeviation statRound ' +
        'stdDev sum sysError systemVersion tan tempName textDecode textEncode tick ticks time to tokenOffset toLower toUpper ' +
        'transpose truewordOffset trunc uniDecode uniEncode upper URLDecode URLEncode URLStatus uuid value variableNames ' +
        'variance version waitDepth weekdayNames wordOffset xsltApplyStylesheet xsltApplyStylesheetFromFile xsltLoadStylesheet ' +
        'xsltLoadStylesheetFromFile add breakpoint cancel clear local variable file word line folder directory URL close socket process ' +
        'combine constant convert create new alias folder directory decrypt delete variable word line folder ' +
        'directory URL dispatch divide do encrypt filter get include intersect kill libURLDownloadToFile ' +
        'libURLFollowHttpRedirects libURLftpUpload libURLftpUploadFile libURLresetAll libUrlSetAuthCallback ' +
        'libURLSetCustomHTTPHeaders libUrlSetExpect100 libURLSetFTPListCommand libURLSetFTPMode libURLSetFTPStopTime ' +
        'libURLSetStatusCallback load multiply socket prepare process post seek rel relative read from process rename ' +
        'replace require resetAll resolve revAddXMLNode revAppendXML revCloseCursor revCloseDatabase revCommitDatabase ' +
        'revCopyFile revCopyFolder revCopyXMLNode revDeleteFolder revDeleteXMLNode revDeleteAllXMLTrees ' +
        'revDeleteXMLTree revExecuteSQL revGoURL revInsertXMLNode revMoveFolder revMoveToFirstRecord revMoveToLastRecord ' +
        'revMoveToNextRecord revMoveToPreviousRecord revMoveToRecord revMoveXMLNode revPutIntoXMLNode revRollBackDatabase ' +
        'revSetDatabaseDriverPath revSetXMLAttribute revXMLRPC_AddParam revXMLRPC_DeleteAllDocuments revXMLAddDTD ' +
        'revXMLRPC_Free revXMLRPC_FreeAll revXMLRPC_DeleteDocument revXMLRPC_DeleteParam revXMLRPC_SetHost ' +
        'revXMLRPC_SetMethod revXMLRPC_SetPort revXMLRPC_SetProtocol revXMLRPC_SetSocket revZipAddItemWithData ' +
        'revZipAddItemWithFile revZipAddUncompressedItemWithData revZipAddUncompressedItemWithFile revZipCancel ' +
        'revZipCloseArchive revZipDeleteItem revZipExtractItemToFile revZipExtractItemToVariable revZipSetProgressCallback ' +
        'revZipRenameItem revZipReplaceItemWithData revZipReplaceItemWithFile revZipOpenArchive send set sort split start stop ' +
        'subtract union unload wait write'
    },
    contains: [
      VARIABLE,
      {
        className: 'keyword',
        begin: '\\bend\\sif\\b'
      },
      {
        className: 'function',
        beginKeywords: 'function', end: '$',
        contains: [
          VARIABLE,
          TITLE2,
          hljs.APOS_STRING_MODE,
          hljs.QUOTE_STRING_MODE,
          hljs.BINARY_NUMBER_MODE,
          hljs.C_NUMBER_MODE,
          TITLE1
        ]
      },
      {
        className: 'function',
        begin: '\\bend\\s+', end: '$',
        keywords: 'end',
        contains: [
          TITLE2,
          TITLE1
        ]
      },
      {
        className: 'command',
        beginKeywords: 'command on', end: '$',
        contains: [
          VARIABLE,
          TITLE2,
          hljs.APOS_STRING_MODE,
          hljs.QUOTE_STRING_MODE,
          hljs.BINARY_NUMBER_MODE,
          hljs.C_NUMBER_MODE,
          TITLE1
        ]
      },
      {
        className: 'preprocessor',
        variants: [
          {
            begin: '<\\?(rev|lc|livecode)',
            relevance: 10
          },
          { begin: '<\\?' },
          { begin: '\\?>' }
        ]
      },
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE,
      hljs.BINARY_NUMBER_MODE,
      hljs.C_NUMBER_MODE,
      TITLE1
    ].concat(COMMENT_MODES),
    illegal: ';$|^\\[|^='
  };
};
},{}],76:[function(require,module,exports){
module.exports = function(hljs) {
  var KEYWORDS = {
    keyword:
      // JS keywords
      'in if for while finally new do return else break catch instanceof throw try this ' +
      'switch continue typeof delete debugger case default function var with ' +
      // LiveScript keywords
      'then unless until loop of by when and or is isnt not it that otherwise from to til fallthrough super ' +
      'case default function var void const let enum export import native ' +
      '__hasProp __extends __slice __bind __indexOf',
    literal:
      // JS literals
      'true false null undefined ' +
      // LiveScript literals
      'yes no on off it that void',
    built_in:
      'npm require console print module global window document'
  };
  var JS_IDENT_RE = '[A-Za-z$_](?:\-[0-9A-Za-z$_]|[0-9A-Za-z$_])*';
  var TITLE = hljs.inherit(hljs.TITLE_MODE, {begin: JS_IDENT_RE});
  var SUBST = {
    className: 'subst',
    begin: /#\{/, end: /}/,
    keywords: KEYWORDS
  };
  var SUBST_SIMPLE = {
    className: 'subst',
    begin: /#[A-Za-z$_]/, end: /(?:\-[0-9A-Za-z$_]|[0-9A-Za-z$_])*/,
    keywords: KEYWORDS
  };
  var EXPRESSIONS = [
    hljs.BINARY_NUMBER_MODE,
    {
      className: 'number',
      begin: '(\\b0[xX][a-fA-F0-9_]+)|(\\b\\d(\\d|_\\d)*(\\.(\\d(\\d|_\\d)*)?)?(_*[eE]([-+]\\d(_\\d|\\d)*)?)?[_a-z]*)',
      relevance: 0,
      starts: {end: '(\\s*/)?', relevance: 0} // a number tries to eat the following slash to prevent treating it as a regexp
    },
    {
      className: 'string',
      variants: [
        {
          begin: /'''/, end: /'''/,
          contains: [hljs.BACKSLASH_ESCAPE]
        },
        {
          begin: /'/, end: /'/,
          contains: [hljs.BACKSLASH_ESCAPE]
        },
        {
          begin: /"""/, end: /"""/,
          contains: [hljs.BACKSLASH_ESCAPE, SUBST, SUBST_SIMPLE]
        },
        {
          begin: /"/, end: /"/,
          contains: [hljs.BACKSLASH_ESCAPE, SUBST, SUBST_SIMPLE]
        },
        {
          begin: /\\/, end: /(\s|$)/,
          excludeEnd: true
        }
      ]
    },
    {
      className: 'pi',
      variants: [
        {
          begin: '//', end: '//[gim]*',
          contains: [SUBST, hljs.HASH_COMMENT_MODE]
        },
        {
          // regex can't start with space to parse x / 2 / 3 as two divisions
          // regex can't start with *, and it supports an "illegal" in the main mode
          begin: /\/(?![ *])(\\\/|.)*?\/[gim]*(?=\W|$)/
        }
      ]
    },
    {
      className: 'property',
      begin: '@' + JS_IDENT_RE
    },
    {
      begin: '``', end: '``',
      excludeBegin: true, excludeEnd: true,
      subLanguage: 'javascript'
    }
  ];
  SUBST.contains = EXPRESSIONS;

  var PARAMS = {
    className: 'params',
    begin: '\\(', returnBegin: true,
    /* We need another contained nameless mode to not have every nested
    pair of parens to be called "params" */
    contains: [
      {
        begin: /\(/, end: /\)/,
        keywords: KEYWORDS,
        contains: ['self'].concat(EXPRESSIONS)
      }
    ]
  };

  return {
    aliases: ['ls'],
    keywords: KEYWORDS,
    illegal: /\/\*/,
    contains: EXPRESSIONS.concat([
      hljs.COMMENT('\\/\\*', '\\*\\/'),
      hljs.HASH_COMMENT_MODE,
      {
        className: 'function',
        contains: [TITLE, PARAMS],
        returnBegin: true,
        variants: [
          {
            begin: '(' + JS_IDENT_RE + '\\s*(?:=|:=)\\s*)?(\\(.*\\))?\\s*\\B\\->\\*?', end: '\\->\\*?'
          },
          {
            begin: '(' + JS_IDENT_RE + '\\s*(?:=|:=)\\s*)?!?(\\(.*\\))?\\s*\\B[-~]{1,2}>\\*?', end: '[-~]{1,2}>\\*?'
          },
          {
            begin: '(' + JS_IDENT_RE + '\\s*(?:=|:=)\\s*)?(\\(.*\\))?\\s*\\B!?[-~]{1,2}>\\*?', end: '!?[-~]{1,2}>\\*?'
          }
        ]
      },
      {
        className: 'class',
        beginKeywords: 'class',
        end: '$',
        illegal: /[:="\[\]]/,
        contains: [
          {
            beginKeywords: 'extends',
            endsWithParent: true,
            illegal: /[:="\[\]]/,
            contains: [TITLE]
          },
          TITLE
        ]
      },
      {
        className: 'attribute',
        begin: JS_IDENT_RE + ':', end: ':',
        returnBegin: true, returnEnd: true,
        relevance: 0
      }
    ])
  };
};
},{}],77:[function(require,module,exports){
module.exports = function(hljs) {
  var OPENING_LONG_BRACKET = '\\[=*\\[';
  var CLOSING_LONG_BRACKET = '\\]=*\\]';
  var LONG_BRACKETS = {
    begin: OPENING_LONG_BRACKET, end: CLOSING_LONG_BRACKET,
    contains: ['self']
  };
  var COMMENTS = [
    hljs.COMMENT('--(?!' + OPENING_LONG_BRACKET + ')', '$'),
    hljs.COMMENT(
      '--' + OPENING_LONG_BRACKET,
      CLOSING_LONG_BRACKET,
      {
        contains: [LONG_BRACKETS],
        relevance: 10
      }
    )
  ];
  return {
    lexemes: hljs.UNDERSCORE_IDENT_RE,
    keywords: {
      keyword:
        'and break do else elseif end false for if in local nil not or repeat return then ' +
        'true until while',
      built_in:
        '_G _VERSION assert collectgarbage dofile error getfenv getmetatable ipairs load ' +
        'loadfile loadstring module next pairs pcall print rawequal rawget rawset require ' +
        'select setfenv setmetatable tonumber tostring type unpack xpcall coroutine debug ' +
        'io math os package string table'
    },
    contains: COMMENTS.concat([
      {
        className: 'function',
        beginKeywords: 'function', end: '\\)',
        contains: [
          hljs.inherit(hljs.TITLE_MODE, {begin: '([_a-zA-Z]\\w*\\.)*([_a-zA-Z]\\w*:)?[_a-zA-Z]\\w*'}),
          {
            className: 'params',
            begin: '\\(', endsWithParent: true,
            contains: COMMENTS
          }
        ].concat(COMMENTS)
      },
      hljs.C_NUMBER_MODE,
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE,
      {
        className: 'string',
        begin: OPENING_LONG_BRACKET, end: CLOSING_LONG_BRACKET,
        contains: [LONG_BRACKETS],
        relevance: 5
      }
    ])
  };
};
},{}],78:[function(require,module,exports){
module.exports = function(hljs) {
  var VARIABLE = {
    className: 'variable',
    begin: /\$\(/, end: /\)/,
    contains: [hljs.BACKSLASH_ESCAPE]
  };
  return {
    aliases: ['mk', 'mak'],
    contains: [
      hljs.HASH_COMMENT_MODE,
      {
        begin: /^\w+\s*\W*=/, returnBegin: true,
        relevance: 0,
        starts: {
          className: 'constant',
          end: /\s*\W*=/, excludeEnd: true,
          starts: {
            end: /$/,
            relevance: 0,
            contains: [
              VARIABLE
            ]
          }
        }
      },
      {
        className: 'title',
        begin: /^[\w]+:\s*$/
      },
      {
        className: 'phony',
        begin: /^\.PHONY:/, end: /$/,
        keywords: '.PHONY', lexemes: /[\.\w]+/
      },
      {
        begin: /^\t+/, end: /$/,
        relevance: 0,
        contains: [
          hljs.QUOTE_STRING_MODE,
          VARIABLE
        ]
      }
    ]
  };
};
},{}],79:[function(require,module,exports){
module.exports = function(hljs) {
  return {
    aliases: ['md', 'mkdown', 'mkd'],
    contains: [
      // highlight headers
      {
        className: 'header',
        variants: [
          { begin: '^#{1,6}', end: '$' },
          { begin: '^.+?\\n[=-]{2,}$' }
        ]
      },
      // inline html
      {
        begin: '<', end: '>',
        subLanguage: 'xml',
        relevance: 0
      },
      // lists (indicators only)
      {
        className: 'bullet',
        begin: '^([*+-]|(\\d+\\.))\\s+'
      },
      // strong segments
      {
        className: 'strong',
        begin: '[*_]{2}.+?[*_]{2}'
      },
      // emphasis segments
      {
        className: 'emphasis',
        variants: [
          { begin: '\\*.+?\\*' },
          { begin: '_.+?_'
          , relevance: 0
          }
        ]
      },
      // blockquotes
      {
        className: 'blockquote',
        begin: '^>\\s+', end: '$'
      },
      // code snippets
      {
        className: 'code',
        variants: [
          { begin: '`.+?`' },
          { begin: '^( {4}|\t)', end: '$'
          , relevance: 0
          }
        ]
      },
      // horizontal rules
      {
        className: 'horizontal_rule',
        begin: '^[-\\*]{3,}', end: '$'
      },
      // using links - title and link
      {
        begin: '\\[.+?\\][\\(\\[].*?[\\)\\]]',
        returnBegin: true,
        contains: [
          {
            className: 'link_label',
            begin: '\\[', end: '\\]',
            excludeBegin: true,
            returnEnd: true,
            relevance: 0
          },
          {
            className: 'link_url',
            begin: '\\]\\(', end: '\\)',
            excludeBegin: true, excludeEnd: true
          },
          {
            className: 'link_reference',
            begin: '\\]\\[', end: '\\]',
            excludeBegin: true, excludeEnd: true
          }
        ],
        relevance: 10
      },
      {
        begin: '^\\[\.+\\]:',
        returnBegin: true,
        contains: [
          {
            className: 'link_reference',
            begin: '\\[', end: '\\]:',
            excludeBegin: true, excludeEnd: true,
            starts: {
              className: 'link_url',
              end: '$'
            }
          }
        ]
      }
    ]
  };
};
},{}],80:[function(require,module,exports){
module.exports = function(hljs) {
  return {
    aliases: ['mma'],
    lexemes: '(\\$|\\b)' + hljs.IDENT_RE + '\\b',
    keywords: 'AbelianGroup Abort AbortKernels AbortProtect Above Abs Absolute AbsoluteCorrelation AbsoluteCorrelationFunction AbsoluteCurrentValue AbsoluteDashing AbsoluteFileName AbsoluteOptions AbsolutePointSize AbsoluteThickness AbsoluteTime AbsoluteTiming AccountingForm Accumulate Accuracy AccuracyGoal ActionDelay ActionMenu ActionMenuBox ActionMenuBoxOptions Active ActiveItem ActiveStyle AcyclicGraphQ AddOnHelpPath AddTo AdjacencyGraph AdjacencyList AdjacencyMatrix AdjustmentBox AdjustmentBoxOptions AdjustTimeSeriesForecast AffineTransform After AiryAi AiryAiPrime AiryAiZero AiryBi AiryBiPrime AiryBiZero AlgebraicIntegerQ AlgebraicNumber AlgebraicNumberDenominator AlgebraicNumberNorm AlgebraicNumberPolynomial AlgebraicNumberTrace AlgebraicRules AlgebraicRulesData Algebraics AlgebraicUnitQ Alignment AlignmentMarker AlignmentPoint All AllowedDimensions AllowGroupClose AllowInlineCells AllowKernelInitialization AllowReverseGroupClose AllowScriptLevelChange AlphaChannel AlternatingGroup AlternativeHypothesis Alternatives AmbientLight Analytic AnchoredSearch And AndersonDarlingTest AngerJ AngleBracket AngularGauge Animate AnimationCycleOffset AnimationCycleRepetitions AnimationDirection AnimationDisplayTime AnimationRate AnimationRepetitions AnimationRunning Animator AnimatorBox AnimatorBoxOptions AnimatorElements Annotation Annuity AnnuityDue Antialiasing Antisymmetric Apart ApartSquareFree Appearance AppearanceElements AppellF1 Append AppendTo Apply ArcCos ArcCosh ArcCot ArcCoth ArcCsc ArcCsch ArcSec ArcSech ArcSin ArcSinDistribution ArcSinh ArcTan ArcTanh Arg ArgMax ArgMin ArgumentCountQ ARIMAProcess ArithmeticGeometricMean ARMAProcess ARProcess Array ArrayComponents ArrayDepth ArrayFlatten ArrayPad ArrayPlot ArrayQ ArrayReshape ArrayRules Arrays Arrow Arrow3DBox ArrowBox Arrowheads AspectRatio AspectRatioFixed Assert Assuming Assumptions AstronomicalData Asynchronous AsynchronousTaskObject AsynchronousTasks AtomQ Attributes AugmentedSymmetricPolynomial AutoAction AutoDelete AutoEvaluateEvents AutoGeneratedPackage AutoIndent AutoIndentSpacings AutoItalicWords AutoloadPath AutoMatch Automatic AutomaticImageSize AutoMultiplicationSymbol AutoNumberFormatting AutoOpenNotebooks AutoOpenPalettes AutorunSequencing AutoScaling AutoScroll AutoSpacing AutoStyleOptions AutoStyleWords Axes AxesEdge AxesLabel AxesOrigin AxesStyle Axis ' +
      'BabyMonsterGroupB Back Background BackgroundTasksSettings Backslash Backsubstitution Backward Band BandpassFilter BandstopFilter BarabasiAlbertGraphDistribution BarChart BarChart3D BarLegend BarlowProschanImportance BarnesG BarOrigin BarSpacing BartlettHannWindow BartlettWindow BaseForm Baseline BaselinePosition BaseStyle BatesDistribution BattleLemarieWavelet Because BeckmannDistribution Beep Before Begin BeginDialogPacket BeginFrontEndInteractionPacket BeginPackage BellB BellY Below BenfordDistribution BeniniDistribution BenktanderGibratDistribution BenktanderWeibullDistribution BernoulliB BernoulliDistribution BernoulliGraphDistribution BernoulliProcess BernsteinBasis BesselFilterModel BesselI BesselJ BesselJZero BesselK BesselY BesselYZero Beta BetaBinomialDistribution BetaDistribution BetaNegativeBinomialDistribution BetaPrimeDistribution BetaRegularized BetweennessCentrality BezierCurve BezierCurve3DBox BezierCurve3DBoxOptions BezierCurveBox BezierCurveBoxOptions BezierFunction BilateralFilter Binarize BinaryFormat BinaryImageQ BinaryRead BinaryReadList BinaryWrite BinCounts BinLists Binomial BinomialDistribution BinomialProcess BinormalDistribution BiorthogonalSplineWavelet BipartiteGraphQ BirnbaumImportance BirnbaumSaundersDistribution BitAnd BitClear BitGet BitLength BitNot BitOr BitSet BitShiftLeft BitShiftRight BitXor Black BlackmanHarrisWindow BlackmanNuttallWindow BlackmanWindow Blank BlankForm BlankNullSequence BlankSequence Blend Block BlockRandom BlomqvistBeta BlomqvistBetaTest Blue Blur BodePlot BohmanWindow Bold Bookmarks Boole BooleanConsecutiveFunction BooleanConvert BooleanCountingFunction BooleanFunction BooleanGraph BooleanMaxterms BooleanMinimize BooleanMinterms Booleans BooleanTable BooleanVariables BorderDimensions BorelTannerDistribution Bottom BottomHatTransform BoundaryStyle Bounds Box BoxBaselineShift BoxData BoxDimensions Boxed Boxes BoxForm BoxFormFormatTypes BoxFrame BoxID BoxMargins BoxMatrix BoxRatios BoxRotation BoxRotationPoint BoxStyle BoxWhiskerChart Bra BracketingBar BraKet BrayCurtisDistance BreadthFirstScan Break Brown BrownForsytheTest BrownianBridgeProcess BrowserCategory BSplineBasis BSplineCurve BSplineCurve3DBox BSplineCurveBox BSplineCurveBoxOptions BSplineFunction BSplineSurface BSplineSurface3DBox BubbleChart BubbleChart3D BubbleScale BubbleSizes BulletGauge BusinessDayQ ButterflyGraph ButterworthFilterModel Button ButtonBar ButtonBox ButtonBoxOptions ButtonCell ButtonContents ButtonData ButtonEvaluator ButtonExpandable ButtonFrame ButtonFunction ButtonMargins ButtonMinHeight ButtonNote ButtonNotebook ButtonSource ButtonStyle ButtonStyleMenuListing Byte ByteCount ByteOrdering ' +
      'C CachedValue CacheGraphics CalendarData CalendarType CallPacket CanberraDistance Cancel CancelButton CandlestickChart Cap CapForm CapitalDifferentialD CardinalBSplineBasis CarmichaelLambda Cases Cashflow Casoratian Catalan CatalanNumber Catch CauchyDistribution CauchyWindow CayleyGraph CDF CDFDeploy CDFInformation CDFWavelet Ceiling Cell CellAutoOverwrite CellBaseline CellBoundingBox CellBracketOptions CellChangeTimes CellContents CellContext CellDingbat CellDynamicExpression CellEditDuplicate CellElementsBoundingBox CellElementSpacings CellEpilog CellEvaluationDuplicate CellEvaluationFunction CellEventActions CellFrame CellFrameColor CellFrameLabelMargins CellFrameLabels CellFrameMargins CellGroup CellGroupData CellGrouping CellGroupingRules CellHorizontalScrolling CellID CellLabel CellLabelAutoDelete CellLabelMargins CellLabelPositioning CellMargins CellObject CellOpen CellPrint CellProlog Cells CellSize CellStyle CellTags CellularAutomaton CensoredDistribution Censoring Center CenterDot CentralMoment CentralMomentGeneratingFunction CForm ChampernowneNumber ChanVeseBinarize Character CharacterEncoding CharacterEncodingsPath CharacteristicFunction CharacteristicPolynomial CharacterRange Characters ChartBaseStyle ChartElementData ChartElementDataFunction ChartElementFunction ChartElements ChartLabels ChartLayout ChartLegends ChartStyle Chebyshev1FilterModel Chebyshev2FilterModel ChebyshevDistance ChebyshevT ChebyshevU Check CheckAbort CheckAll Checkbox CheckboxBar CheckboxBox CheckboxBoxOptions ChemicalData ChessboardDistance ChiDistribution ChineseRemainder ChiSquareDistribution ChoiceButtons ChoiceDialog CholeskyDecomposition Chop Circle CircleBox CircleDot CircleMinus CirclePlus CircleTimes CirculantGraph CityData Clear ClearAll ClearAttributes ClearSystemCache ClebschGordan ClickPane Clip ClipboardNotebook ClipFill ClippingStyle ClipPlanes ClipRange Clock ClockGauge ClockwiseContourIntegral Close Closed CloseKernels ClosenessCentrality Closing ClosingAutoSave ClosingEvent ClusteringComponents CMYKColor Coarse Coefficient CoefficientArrays CoefficientDomain CoefficientList CoefficientRules CoifletWavelet Collect Colon ColonForm ColorCombine ColorConvert ColorData ColorDataFunction ColorFunction ColorFunctionScaling Colorize ColorNegate ColorOutput ColorProfileData ColorQuantize ColorReplace ColorRules ColorSelectorSettings ColorSeparate ColorSetter ColorSetterBox ColorSetterBoxOptions ColorSlider ColorSpace Column ColumnAlignments ColumnBackgrounds ColumnForm ColumnLines ColumnsEqual ColumnSpacings ColumnWidths CommonDefaultFormatTypes Commonest CommonestFilter CommonUnits CommunityBoundaryStyle CommunityGraphPlot CommunityLabels CommunityRegionStyle CompatibleUnitQ CompilationOptions CompilationTarget Compile Compiled CompiledFunction Complement CompleteGraph CompleteGraphQ CompleteKaryTree CompletionsListPacket Complex Complexes ComplexExpand ComplexInfinity ComplexityFunction ComponentMeasurements ' +
      'ComponentwiseContextMenu Compose ComposeList ComposeSeries Composition CompoundExpression CompoundPoissonDistribution CompoundPoissonProcess CompoundRenewalProcess Compress CompressedData Condition ConditionalExpression Conditioned Cone ConeBox ConfidenceLevel ConfidenceRange ConfidenceTransform ConfigurationPath Congruent Conjugate ConjugateTranspose Conjunction Connect ConnectedComponents ConnectedGraphQ ConnesWindow ConoverTest ConsoleMessage ConsoleMessagePacket ConsolePrint Constant ConstantArray Constants ConstrainedMax ConstrainedMin ContentPadding ContentsBoundingBox ContentSelectable ContentSize Context ContextMenu Contexts ContextToFilename ContextToFileName Continuation Continue ContinuedFraction ContinuedFractionK ContinuousAction ContinuousMarkovProcess ContinuousTimeModelQ ContinuousWaveletData ContinuousWaveletTransform ContourDetect ContourGraphics ContourIntegral ContourLabels ContourLines ContourPlot ContourPlot3D Contours ContourShading ContourSmoothing ContourStyle ContraharmonicMean Control ControlActive ControlAlignment ControllabilityGramian ControllabilityMatrix ControllableDecomposition ControllableModelQ ControllerDuration ControllerInformation ControllerInformationData ControllerLinking ControllerManipulate ControllerMethod ControllerPath ControllerState ControlPlacement ControlsRendering ControlType Convergents ConversionOptions ConversionRules ConvertToBitmapPacket ConvertToPostScript ConvertToPostScriptPacket Convolve ConwayGroupCo1 ConwayGroupCo2 ConwayGroupCo3 CoordinateChartData CoordinatesToolOptions CoordinateTransform CoordinateTransformData CoprimeQ Coproduct CopulaDistribution Copyable CopyDirectory CopyFile CopyTag CopyToClipboard CornerFilter CornerNeighbors Correlation CorrelationDistance CorrelationFunction CorrelationTest Cos Cosh CoshIntegral CosineDistance CosineWindow CosIntegral Cot Coth Count CounterAssignments CounterBox CounterBoxOptions CounterClockwiseContourIntegral CounterEvaluator CounterFunction CounterIncrements CounterStyle CounterStyleMenuListing CountRoots CountryData Covariance CovarianceEstimatorFunction CovarianceFunction CoxianDistribution CoxIngersollRossProcess CoxModel CoxModelFit CramerVonMisesTest CreateArchive CreateDialog CreateDirectory CreateDocument CreateIntermediateDirectories CreatePalette CreatePalettePacket CreateScheduledTask CreateTemporary CreateWindow CriticalityFailureImportance CriticalitySuccessImportance CriticalSection Cross CrossingDetect CrossMatrix Csc Csch CubeRoot Cubics Cuboid CuboidBox Cumulant CumulantGeneratingFunction Cup CupCap Curl CurlyDoubleQuote CurlyQuote CurrentImage CurrentlySpeakingPacket CurrentValue CurvatureFlowFilter CurveClosed Cyan CycleGraph CycleIndexPolynomial Cycles CyclicGroup Cyclotomic Cylinder CylinderBox CylindricalDecomposition ' +
      'D DagumDistribution DamerauLevenshteinDistance DampingFactor Darker Dashed Dashing DataCompression DataDistribution DataRange DataReversed Date DateDelimiters DateDifference DateFunction DateList DateListLogPlot DateListPlot DatePattern DatePlus DateRange DateString DateTicksFormat DaubechiesWavelet DavisDistribution DawsonF DayCount DayCountConvention DayMatchQ DayName DayPlus DayRange DayRound DeBruijnGraph Debug DebugTag Decimal DeclareKnownSymbols DeclarePackage Decompose Decrement DedekindEta Default DefaultAxesStyle DefaultBaseStyle DefaultBoxStyle DefaultButton DefaultColor DefaultControlPlacement DefaultDuplicateCellStyle DefaultDuration DefaultElement DefaultFaceGridsStyle DefaultFieldHintStyle DefaultFont DefaultFontProperties DefaultFormatType DefaultFormatTypeForStyle DefaultFrameStyle DefaultFrameTicksStyle DefaultGridLinesStyle DefaultInlineFormatType DefaultInputFormatType DefaultLabelStyle DefaultMenuStyle DefaultNaturalLanguage DefaultNewCellStyle DefaultNewInlineCellStyle DefaultNotebook DefaultOptions DefaultOutputFormatType DefaultStyle DefaultStyleDefinitions DefaultTextFormatType DefaultTextInlineFormatType DefaultTicksStyle DefaultTooltipStyle DefaultValues Defer DefineExternal DefineInputStreamMethod DefineOutputStreamMethod Definition Degree DegreeCentrality DegreeGraphDistribution DegreeLexicographic DegreeReverseLexicographic Deinitialization Del Deletable Delete DeleteBorderComponents DeleteCases DeleteContents DeleteDirectory DeleteDuplicates DeleteFile DeleteSmallComponents DeleteWithContents DeletionWarning Delimiter DelimiterFlashTime DelimiterMatching Delimiters Denominator DensityGraphics DensityHistogram DensityPlot DependentVariables Deploy Deployed Depth DepthFirstScan Derivative DerivativeFilter DescriptorStateSpace DesignMatrix Det DGaussianWavelet DiacriticalPositioning Diagonal DiagonalMatrix Dialog DialogIndent DialogInput DialogLevel DialogNotebook DialogProlog DialogReturn DialogSymbols Diamond DiamondMatrix DiceDissimilarity DictionaryLookup DifferenceDelta DifferenceOrder DifferenceRoot DifferenceRootReduce Differences DifferentialD DifferentialRoot DifferentialRootReduce DifferentiatorFilter DigitBlock DigitBlockMinimum DigitCharacter DigitCount DigitQ DihedralGroup Dilation Dimensions DiracComb DiracDelta DirectedEdge DirectedEdges DirectedGraph DirectedGraphQ DirectedInfinity Direction Directive Directory DirectoryName DirectoryQ DirectoryStack DirichletCharacter DirichletConvolve DirichletDistribution DirichletL DirichletTransform DirichletWindow DisableConsolePrintPacket DiscreteChirpZTransform DiscreteConvolve DiscreteDelta DiscreteHadamardTransform DiscreteIndicator DiscreteLQEstimatorGains DiscreteLQRegulatorGains DiscreteLyapunovSolve DiscreteMarkovProcess DiscretePlot DiscretePlot3D DiscreteRatio DiscreteRiccatiSolve DiscreteShift DiscreteTimeModelQ DiscreteUniformDistribution DiscreteVariables DiscreteWaveletData DiscreteWaveletPacketTransform ' +
      'DiscreteWaveletTransform Discriminant Disjunction Disk DiskBox DiskMatrix Dispatch DispersionEstimatorFunction Display DisplayAllSteps DisplayEndPacket DisplayFlushImagePacket DisplayForm DisplayFunction DisplayPacket DisplayRules DisplaySetSizePacket DisplayString DisplayTemporary DisplayWith DisplayWithRef DisplayWithVariable DistanceFunction DistanceTransform Distribute Distributed DistributedContexts DistributeDefinitions DistributionChart DistributionDomain DistributionFitTest DistributionParameterAssumptions DistributionParameterQ Dithering Div Divergence Divide DivideBy Dividers Divisible Divisors DivisorSigma DivisorSum DMSList DMSString Do DockedCells DocumentNotebook DominantColors DOSTextFormat Dot DotDashed DotEqual Dotted DoubleBracketingBar DoubleContourIntegral DoubleDownArrow DoubleLeftArrow DoubleLeftRightArrow DoubleLeftTee DoubleLongLeftArrow DoubleLongLeftRightArrow DoubleLongRightArrow DoubleRightArrow DoubleRightTee DoubleUpArrow DoubleUpDownArrow DoubleVerticalBar DoublyInfinite Down DownArrow DownArrowBar DownArrowUpArrow DownLeftRightVector DownLeftTeeVector DownLeftVector DownLeftVectorBar DownRightTeeVector DownRightVector DownRightVectorBar Downsample DownTee DownTeeArrow DownValues DragAndDrop DrawEdges DrawFrontFaces DrawHighlighted Drop DSolve Dt DualLinearProgramming DualSystemsModel DumpGet DumpSave DuplicateFreeQ Dynamic DynamicBox DynamicBoxOptions DynamicEvaluationTimeout DynamicLocation DynamicModule DynamicModuleBox DynamicModuleBoxOptions DynamicModuleParent DynamicModuleValues DynamicName DynamicNamespace DynamicReference DynamicSetting DynamicUpdating DynamicWrapper DynamicWrapperBox DynamicWrapperBoxOptions ' +
      'E EccentricityCentrality EdgeAdd EdgeBetweennessCentrality EdgeCapacity EdgeCapForm EdgeColor EdgeConnectivity EdgeCost EdgeCount EdgeCoverQ EdgeDashing EdgeDelete EdgeDetect EdgeForm EdgeIndex EdgeJoinForm EdgeLabeling EdgeLabels EdgeLabelStyle EdgeList EdgeOpacity EdgeQ EdgeRenderingFunction EdgeRules EdgeShapeFunction EdgeStyle EdgeThickness EdgeWeight Editable EditButtonSettings EditCellTagsSettings EditDistance EffectiveInterest Eigensystem Eigenvalues EigenvectorCentrality Eigenvectors Element ElementData Eliminate EliminationOrder EllipticE EllipticExp EllipticExpPrime EllipticF EllipticFilterModel EllipticK EllipticLog EllipticNomeQ EllipticPi EllipticReducedHalfPeriods EllipticTheta EllipticThetaPrime EmitSound EmphasizeSyntaxErrors EmpiricalDistribution Empty EmptyGraphQ EnableConsolePrintPacket Enabled Encode End EndAdd EndDialogPacket EndFrontEndInteractionPacket EndOfFile EndOfLine EndOfString EndPackage EngineeringForm Enter EnterExpressionPacket EnterTextPacket Entropy EntropyFilter Environment Epilog Equal EqualColumns EqualRows EqualTilde EquatedTo Equilibrium EquirippleFilterKernel Equivalent Erf Erfc Erfi ErlangB ErlangC ErlangDistribution Erosion ErrorBox ErrorBoxOptions ErrorNorm ErrorPacket ErrorsDialogSettings EstimatedDistribution EstimatedProcess EstimatorGains EstimatorRegulator EuclideanDistance EulerE EulerGamma EulerianGraphQ EulerPhi Evaluatable Evaluate Evaluated EvaluatePacket EvaluationCell EvaluationCompletionAction EvaluationElements EvaluationMode EvaluationMonitor EvaluationNotebook EvaluationObject EvaluationOrder Evaluator EvaluatorNames EvenQ EventData EventEvaluator EventHandler EventHandlerTag EventLabels ExactBlackmanWindow ExactNumberQ ExactRootIsolation ExampleData Except ExcludedForms ExcludePods Exclusions ExclusionsStyle Exists Exit ExitDialog Exp Expand ExpandAll ExpandDenominator ExpandFileName ExpandNumerator Expectation ExpectationE ExpectedValue ExpGammaDistribution ExpIntegralE ExpIntegralEi Exponent ExponentFunction ExponentialDistribution ExponentialFamily ExponentialGeneratingFunction ExponentialMovingAverage ExponentialPowerDistribution ExponentPosition ExponentStep Export ExportAutoReplacements ExportPacket ExportString Expression ExpressionCell ExpressionPacket ExpToTrig ExtendedGCD Extension ExtentElementFunction ExtentMarkers ExtentSize ExternalCall ExternalDataCharacterEncoding Extract ExtractArchive ExtremeValueDistribution ' +
      'FaceForm FaceGrids FaceGridsStyle Factor FactorComplete Factorial Factorial2 FactorialMoment FactorialMomentGeneratingFunction FactorialPower FactorInteger FactorList FactorSquareFree FactorSquareFreeList FactorTerms FactorTermsList Fail FailureDistribution False FARIMAProcess FEDisableConsolePrintPacket FeedbackSector FeedbackSectorStyle FeedbackType FEEnableConsolePrintPacket Fibonacci FieldHint FieldHintStyle FieldMasked FieldSize File FileBaseName FileByteCount FileDate FileExistsQ FileExtension FileFormat FileHash FileInformation FileName FileNameDepth FileNameDialogSettings FileNameDrop FileNameJoin FileNames FileNameSetter FileNameSplit FileNameTake FilePrint FileType FilledCurve FilledCurveBox Filling FillingStyle FillingTransform FilterRules FinancialBond FinancialData FinancialDerivative FinancialIndicator Find FindArgMax FindArgMin FindClique FindClusters FindCurvePath FindDistributionParameters FindDivisions FindEdgeCover FindEdgeCut FindEulerianCycle FindFaces FindFile FindFit FindGeneratingFunction FindGeoLocation FindGeometricTransform FindGraphCommunities FindGraphIsomorphism FindGraphPartition FindHamiltonianCycle FindIndependentEdgeSet FindIndependentVertexSet FindInstance FindIntegerNullVector FindKClan FindKClique FindKClub FindKPlex FindLibrary FindLinearRecurrence FindList FindMaximum FindMaximumFlow FindMaxValue FindMinimum FindMinimumCostFlow FindMinimumCut FindMinValue FindPermutation FindPostmanTour FindProcessParameters FindRoot FindSequenceFunction FindSettings FindShortestPath FindShortestTour FindThreshold FindVertexCover FindVertexCut Fine FinishDynamic FiniteAbelianGroupCount FiniteGroupCount FiniteGroupData First FirstPassageTimeDistribution FischerGroupFi22 FischerGroupFi23 FischerGroupFi24Prime FisherHypergeometricDistribution FisherRatioTest FisherZDistribution Fit FitAll FittedModel FixedPoint FixedPointList FlashSelection Flat Flatten FlattenAt FlatTopWindow FlipView Floor FlushPrintOutputPacket Fold FoldList Font FontColor FontFamily FontForm FontName FontOpacity FontPostScriptName FontProperties FontReencoding FontSize FontSlant FontSubstitutions FontTracking FontVariations FontWeight For ForAll Format FormatRules FormatType FormatTypeAutoConvert FormatValues FormBox FormBoxOptions FortranForm Forward ForwardBackward Fourier FourierCoefficient FourierCosCoefficient FourierCosSeries FourierCosTransform FourierDCT FourierDCTFilter FourierDCTMatrix FourierDST FourierDSTMatrix FourierMatrix FourierParameters FourierSequenceTransform FourierSeries FourierSinCoefficient FourierSinSeries FourierSinTransform FourierTransform FourierTrigSeries FractionalBrownianMotionProcess FractionalPart FractionBox FractionBoxOptions FractionLine Frame FrameBox FrameBoxOptions Framed FrameInset FrameLabel Frameless FrameMargins FrameStyle FrameTicks FrameTicksStyle FRatioDistribution FrechetDistribution FreeQ FrequencySamplingFilterKernel FresnelC FresnelS Friday FrobeniusNumber FrobeniusSolve ' +
      'FromCharacterCode FromCoefficientRules FromContinuedFraction FromDate FromDigits FromDMS Front FrontEndDynamicExpression FrontEndEventActions FrontEndExecute FrontEndObject FrontEndResource FrontEndResourceString FrontEndStackSize FrontEndToken FrontEndTokenExecute FrontEndValueCache FrontEndVersion FrontFaceColor FrontFaceOpacity Full FullAxes FullDefinition FullForm FullGraphics FullOptions FullSimplify Function FunctionExpand FunctionInterpolation FunctionSpace FussellVeselyImportance ' +
      'GaborFilter GaborMatrix GaborWavelet GainMargins GainPhaseMargins Gamma GammaDistribution GammaRegularized GapPenalty Gather GatherBy GaugeFaceElementFunction GaugeFaceStyle GaugeFrameElementFunction GaugeFrameSize GaugeFrameStyle GaugeLabels GaugeMarkers GaugeStyle GaussianFilter GaussianIntegers GaussianMatrix GaussianWindow GCD GegenbauerC General GeneralizedLinearModelFit GenerateConditions GeneratedCell GeneratedParameters GeneratingFunction Generic GenericCylindricalDecomposition GenomeData GenomeLookup GeodesicClosing GeodesicDilation GeodesicErosion GeodesicOpening GeoDestination GeodesyData GeoDirection GeoDistance GeoGridPosition GeometricBrownianMotionProcess GeometricDistribution GeometricMean GeometricMeanFilter GeometricTransformation GeometricTransformation3DBox GeometricTransformation3DBoxOptions GeometricTransformationBox GeometricTransformationBoxOptions GeoPosition GeoPositionENU GeoPositionXYZ GeoProjectionData GestureHandler GestureHandlerTag Get GetBoundingBoxSizePacket GetContext GetEnvironment GetFileName GetFrontEndOptionsDataPacket GetLinebreakInformationPacket GetMenusPacket GetPageBreakInformationPacket Glaisher GlobalClusteringCoefficient GlobalPreferences GlobalSession Glow GoldenRatio GompertzMakehamDistribution GoodmanKruskalGamma GoodmanKruskalGammaTest Goto Grad Gradient GradientFilter GradientOrientationFilter Graph GraphAssortativity GraphCenter GraphComplement GraphData GraphDensity GraphDiameter GraphDifference GraphDisjointUnion ' +
      'GraphDistance GraphDistanceMatrix GraphElementData GraphEmbedding GraphHighlight GraphHighlightStyle GraphHub Graphics Graphics3D Graphics3DBox Graphics3DBoxOptions GraphicsArray GraphicsBaseline GraphicsBox GraphicsBoxOptions GraphicsColor GraphicsColumn GraphicsComplex GraphicsComplex3DBox GraphicsComplex3DBoxOptions GraphicsComplexBox GraphicsComplexBoxOptions GraphicsContents GraphicsData GraphicsGrid GraphicsGridBox GraphicsGroup GraphicsGroup3DBox GraphicsGroup3DBoxOptions GraphicsGroupBox GraphicsGroupBoxOptions GraphicsGrouping GraphicsHighlightColor GraphicsRow GraphicsSpacing GraphicsStyle GraphIntersection GraphLayout GraphLinkEfficiency GraphPeriphery GraphPlot GraphPlot3D GraphPower GraphPropertyDistribution GraphQ GraphRadius GraphReciprocity GraphRoot GraphStyle GraphUnion Gray GrayLevel GreatCircleDistance Greater GreaterEqual GreaterEqualLess GreaterFullEqual GreaterGreater GreaterLess GreaterSlantEqual GreaterTilde Green Grid GridBaseline GridBox GridBoxAlignment GridBoxBackground GridBoxDividers GridBoxFrame GridBoxItemSize GridBoxItemStyle GridBoxOptions GridBoxSpacings GridCreationSettings GridDefaultElement GridElementStyleOptions GridFrame GridFrameMargins GridGraph GridLines GridLinesStyle GroebnerBasis GroupActionBase GroupCentralizer GroupElementFromWord GroupElementPosition GroupElementQ GroupElements GroupElementToWord GroupGenerators GroupMultiplicationTable GroupOrbits GroupOrder GroupPageBreakWithin GroupSetwiseStabilizer GroupStabilizer GroupStabilizerChain Gudermannian GumbelDistribution ' +
      'HaarWavelet HadamardMatrix HalfNormalDistribution HamiltonianGraphQ HammingDistance HammingWindow HankelH1 HankelH2 HankelMatrix HannPoissonWindow HannWindow HaradaNortonGroupHN HararyGraph HarmonicMean HarmonicMeanFilter HarmonicNumber Hash HashTable Haversine HazardFunction Head HeadCompose Heads HeavisideLambda HeavisidePi HeavisideTheta HeldGroupHe HeldPart HelpBrowserLookup HelpBrowserNotebook HelpBrowserSettings HermiteDecomposition HermiteH HermitianMatrixQ HessenbergDecomposition Hessian HexadecimalCharacter Hexahedron HexahedronBox HexahedronBoxOptions HiddenSurface HighlightGraph HighlightImage HighpassFilter HigmanSimsGroupHS HilbertFilter HilbertMatrix Histogram Histogram3D HistogramDistribution HistogramList HistogramTransform HistogramTransformInterpolation HitMissTransform HITSCentrality HodgeDual HoeffdingD HoeffdingDTest Hold HoldAll HoldAllComplete HoldComplete HoldFirst HoldForm HoldPattern HoldRest HolidayCalendar HomeDirectory HomePage Horizontal HorizontalForm HorizontalGauge HorizontalScrollPosition HornerForm HotellingTSquareDistribution HoytDistribution HTMLSave Hue HumpDownHump HumpEqual HurwitzLerchPhi HurwitzZeta HyperbolicDistribution HypercubeGraph HyperexponentialDistribution Hyperfactorial Hypergeometric0F1 Hypergeometric0F1Regularized Hypergeometric1F1 Hypergeometric1F1Regularized Hypergeometric2F1 Hypergeometric2F1Regularized HypergeometricDistribution HypergeometricPFQ HypergeometricPFQRegularized HypergeometricU Hyperlink HyperlinkCreationSettings Hyphenation HyphenationOptions HypoexponentialDistribution HypothesisTestData ' +
      'I Identity IdentityMatrix If IgnoreCase Im Image Image3D Image3DSlices ImageAccumulate ImageAdd ImageAdjust ImageAlign ImageApply ImageAspectRatio ImageAssemble ImageCache ImageCacheValid ImageCapture ImageChannels ImageClip ImageColorSpace ImageCompose ImageConvolve ImageCooccurrence ImageCorners ImageCorrelate ImageCorrespondingPoints ImageCrop ImageData ImageDataPacket ImageDeconvolve ImageDemosaic ImageDifference ImageDimensions ImageDistance ImageEffect ImageFeatureTrack ImageFileApply ImageFileFilter ImageFileScan ImageFilter ImageForestingComponents ImageForwardTransformation ImageHistogram ImageKeypoints ImageLevels ImageLines ImageMargins ImageMarkers ImageMeasurements ImageMultiply ImageOffset ImagePad ImagePadding ImagePartition ImagePeriodogram ImagePerspectiveTransformation ImageQ ImageRangeCache ImageReflect ImageRegion ImageResize ImageResolution ImageRotate ImageRotated ImageScaled ImageScan ImageSize ImageSizeAction ImageSizeCache ImageSizeMultipliers ImageSizeRaw ImageSubtract ImageTake ImageTransformation ImageTrim ImageType ImageValue ImageValuePositions Implies Import ImportAutoReplacements ImportString ImprovementImportance In IncidenceGraph IncidenceList IncidenceMatrix IncludeConstantBasis IncludeFileExtension IncludePods IncludeSingularTerm Increment Indent IndentingNewlineSpacings IndentMaxFraction IndependenceTest IndependentEdgeSetQ IndependentUnit IndependentVertexSetQ Indeterminate IndexCreationOptions Indexed IndexGraph IndexTag Inequality InexactNumberQ InexactNumbers Infinity Infix Information Inherited InheritScope Initialization InitializationCell InitializationCellEvaluation InitializationCellWarning InlineCounterAssignments InlineCounterIncrements InlineRules Inner Inpaint Input InputAliases InputAssumptions InputAutoReplacements InputField InputFieldBox InputFieldBoxOptions InputForm InputGrouping InputNamePacket InputNotebook InputPacket InputSettings InputStream InputString InputStringPacket InputToBoxFormPacket Insert InsertionPointObject InsertResults Inset Inset3DBox Inset3DBoxOptions InsetBox InsetBoxOptions Install InstallService InString Integer IntegerDigits IntegerExponent IntegerLength IntegerPart IntegerPartitions IntegerQ Integers IntegerString Integral Integrate Interactive InteractiveTradingChart Interlaced Interleaving InternallyBalancedDecomposition InterpolatingFunction InterpolatingPolynomial Interpolation InterpolationOrder InterpolationPoints InterpolationPrecision Interpretation InterpretationBox InterpretationBoxOptions InterpretationFunction ' +
      'InterpretTemplate InterquartileRange Interrupt InterruptSettings Intersection Interval IntervalIntersection IntervalMemberQ IntervalUnion Inverse InverseBetaRegularized InverseCDF InverseChiSquareDistribution InverseContinuousWaveletTransform InverseDistanceTransform InverseEllipticNomeQ InverseErf InverseErfc InverseFourier InverseFourierCosTransform InverseFourierSequenceTransform InverseFourierSinTransform InverseFourierTransform InverseFunction InverseFunctions InverseGammaDistribution InverseGammaRegularized InverseGaussianDistribution InverseGudermannian InverseHaversine InverseJacobiCD InverseJacobiCN InverseJacobiCS InverseJacobiDC InverseJacobiDN InverseJacobiDS InverseJacobiNC InverseJacobiND InverseJacobiNS InverseJacobiSC InverseJacobiSD InverseJacobiSN InverseLaplaceTransform InversePermutation InverseRadon InverseSeries InverseSurvivalFunction InverseWaveletTransform InverseWeierstrassP InverseZTransform Invisible InvisibleApplication InvisibleTimes IrreduciblePolynomialQ IsolatingInterval IsomorphicGraphQ IsotopeData Italic Item ItemBox ItemBoxOptions ItemSize ItemStyle ItoProcess ' +
      'JaccardDissimilarity JacobiAmplitude Jacobian JacobiCD JacobiCN JacobiCS JacobiDC JacobiDN JacobiDS JacobiNC JacobiND JacobiNS JacobiP JacobiSC JacobiSD JacobiSN JacobiSymbol JacobiZeta JankoGroupJ1 JankoGroupJ2 JankoGroupJ3 JankoGroupJ4 JarqueBeraALMTest JohnsonDistribution Join Joined JoinedCurve JoinedCurveBox JoinForm JordanDecomposition JordanModelDecomposition ' +
      'K KagiChart KaiserBesselWindow KaiserWindow KalmanEstimator KalmanFilter KarhunenLoeveDecomposition KaryTree KatzCentrality KCoreComponents KDistribution KelvinBei KelvinBer KelvinKei KelvinKer KendallTau KendallTauTest KernelExecute KernelMixtureDistribution KernelObject Kernels Ket Khinchin KirchhoffGraph KirchhoffMatrix KleinInvariantJ KnightTourGraph KnotData KnownUnitQ KolmogorovSmirnovTest KroneckerDelta KroneckerModelDecomposition KroneckerProduct KroneckerSymbol KuiperTest KumaraswamyDistribution Kurtosis KuwaharaFilter ' +
      'Label Labeled LabeledSlider LabelingFunction LabelStyle LaguerreL LambdaComponents LambertW LanczosWindow LandauDistribution Language LanguageCategory LaplaceDistribution LaplaceTransform Laplacian LaplacianFilter LaplacianGaussianFilter Large Larger Last Latitude LatitudeLongitude LatticeData LatticeReduce Launch LaunchKernels LayeredGraphPlot LayerSizeFunction LayoutInformation LCM LeafCount LeapYearQ LeastSquares LeastSquaresFilterKernel Left LeftArrow LeftArrowBar LeftArrowRightArrow LeftDownTeeVector LeftDownVector LeftDownVectorBar LeftRightArrow LeftRightVector LeftTee LeftTeeArrow LeftTeeVector LeftTriangle LeftTriangleBar LeftTriangleEqual LeftUpDownVector LeftUpTeeVector LeftUpVector LeftUpVectorBar LeftVector LeftVectorBar LegendAppearance Legended LegendFunction LegendLabel LegendLayout LegendMargins LegendMarkers LegendMarkerSize LegendreP LegendreQ LegendreType Length LengthWhile LerchPhi Less LessEqual LessEqualGreater LessFullEqual LessGreater LessLess LessSlantEqual LessTilde LetterCharacter LetterQ Level LeveneTest LeviCivitaTensor LevyDistribution Lexicographic LibraryFunction LibraryFunctionError LibraryFunctionInformation LibraryFunctionLoad LibraryFunctionUnload LibraryLoad LibraryUnload LicenseID LiftingFilterData LiftingWaveletTransform LightBlue LightBrown LightCyan Lighter LightGray LightGreen Lighting LightingAngle LightMagenta LightOrange LightPink LightPurple LightRed LightSources LightYellow Likelihood Limit LimitsPositioning LimitsPositioningTokens LindleyDistribution Line Line3DBox LinearFilter LinearFractionalTransform LinearModelFit LinearOffsetFunction LinearProgramming LinearRecurrence LinearSolve LinearSolveFunction LineBox LineBreak LinebreakAdjustments LineBreakChart LineBreakWithin LineColor LineForm LineGraph LineIndent LineIndentMaxFraction LineIntegralConvolutionPlot LineIntegralConvolutionScale LineLegend LineOpacity LineSpacing LineWrapParts LinkActivate LinkClose LinkConnect LinkConnectedQ LinkCreate LinkError LinkFlush LinkFunction LinkHost LinkInterrupt LinkLaunch LinkMode LinkObject LinkOpen LinkOptions LinkPatterns LinkProtocol LinkRead LinkReadHeld LinkReadyQ Links LinkWrite LinkWriteHeld LiouvilleLambda List Listable ListAnimate ListContourPlot ListContourPlot3D ListConvolve ListCorrelate ListCurvePathPlot ListDeconvolve ListDensityPlot Listen ListFourierSequenceTransform ListInterpolation ListLineIntegralConvolutionPlot ListLinePlot ListLogLinearPlot ListLogLogPlot ListLogPlot ListPicker ListPickerBox ListPickerBoxBackground ListPickerBoxOptions ListPlay ListPlot ListPlot3D ListPointPlot3D ListPolarPlot ListQ ListStreamDensityPlot ListStreamPlot ListSurfacePlot3D ListVectorDensityPlot ListVectorPlot ListVectorPlot3D ListZTransform Literal LiteralSearch LocalClusteringCoefficient LocalizeVariables LocationEquivalenceTest LocationTest Locator LocatorAutoCreate LocatorBox LocatorBoxOptions LocatorCentering LocatorPane LocatorPaneBox LocatorPaneBoxOptions ' +
      'LocatorRegion Locked Log Log10 Log2 LogBarnesG LogGamma LogGammaDistribution LogicalExpand LogIntegral LogisticDistribution LogitModelFit LogLikelihood LogLinearPlot LogLogisticDistribution LogLogPlot LogMultinormalDistribution LogNormalDistribution LogPlot LogRankTest LogSeriesDistribution LongEqual Longest LongestAscendingSequence LongestCommonSequence LongestCommonSequencePositions LongestCommonSubsequence LongestCommonSubsequencePositions LongestMatch LongForm Longitude LongLeftArrow LongLeftRightArrow LongRightArrow Loopback LoopFreeGraphQ LowerCaseQ LowerLeftArrow LowerRightArrow LowerTriangularize LowpassFilter LQEstimatorGains LQGRegulator LQOutputRegulatorGains LQRegulatorGains LUBackSubstitution LucasL LuccioSamiComponents LUDecomposition LyapunovSolve LyonsGroupLy ' +
      'MachineID MachineName MachineNumberQ MachinePrecision MacintoshSystemPageSetup Magenta Magnification Magnify MainSolve MaintainDynamicCaches Majority MakeBoxes MakeExpression MakeRules MangoldtLambda ManhattanDistance Manipulate Manipulator MannWhitneyTest MantissaExponent Manual Map MapAll MapAt MapIndexed MAProcess MapThread MarcumQ MardiaCombinedTest MardiaKurtosisTest MardiaSkewnessTest MarginalDistribution MarkovProcessProperties Masking MatchingDissimilarity MatchLocalNameQ MatchLocalNames MatchQ Material MathematicaNotation MathieuC MathieuCharacteristicA MathieuCharacteristicB MathieuCharacteristicExponent MathieuCPrime MathieuGroupM11 MathieuGroupM12 MathieuGroupM22 MathieuGroupM23 MathieuGroupM24 MathieuS MathieuSPrime MathMLForm MathMLText Matrices MatrixExp MatrixForm MatrixFunction MatrixLog MatrixPlot MatrixPower MatrixQ MatrixRank Max MaxBend MaxDetect MaxExtraBandwidths MaxExtraConditions MaxFeatures MaxFilter Maximize MaxIterations MaxMemoryUsed MaxMixtureKernels MaxPlotPoints MaxPoints MaxRecursion MaxStableDistribution MaxStepFraction MaxSteps MaxStepSize MaxValue MaxwellDistribution McLaughlinGroupMcL Mean MeanClusteringCoefficient MeanDegreeConnectivity MeanDeviation MeanFilter MeanGraphDistance MeanNeighborDegree MeanShift MeanShiftFilter Median MedianDeviation MedianFilter Medium MeijerG MeixnerDistribution MemberQ MemoryConstrained MemoryInUse Menu MenuAppearance MenuCommandKey MenuEvaluator MenuItem MenuPacket MenuSortingValue MenuStyle MenuView MergeDifferences Mesh MeshFunctions MeshRange MeshShading MeshStyle Message MessageDialog MessageList MessageName MessageOptions MessagePacket Messages MessagesNotebook MetaCharacters MetaInformation Method MethodOptions MexicanHatWavelet MeyerWavelet Min MinDetect MinFilter MinimalPolynomial MinimalStateSpaceModel Minimize Minors MinRecursion MinSize MinStableDistribution Minus MinusPlus MinValue Missing MissingDataMethod MittagLefflerE MixedRadix MixedRadixQuantity MixtureDistribution Mod Modal Mode Modular ModularLambda Module Modulus MoebiusMu Moment Momentary MomentConvert MomentEvaluate MomentGeneratingFunction Monday Monitor MonomialList MonomialOrder MonsterGroupM MorletWavelet MorphologicalBinarize MorphologicalBranchPoints MorphologicalComponents MorphologicalEulerNumber MorphologicalGraph MorphologicalPerimeter MorphologicalTransform Most MouseAnnotation MouseAppearance MouseAppearanceTag MouseButtons Mouseover MousePointerNote MousePosition MovingAverage MovingMedian MoyalDistribution MultiedgeStyle MultilaunchWarning MultiLetterItalics MultiLetterStyle MultilineFunction Multinomial MultinomialDistribution MultinormalDistribution MultiplicativeOrder Multiplicity Multiselection MultivariateHypergeometricDistribution MultivariatePoissonDistribution MultivariateTDistribution ' +
      'N NakagamiDistribution NameQ Names NamespaceBox Nand NArgMax NArgMin NBernoulliB NCache NDSolve NDSolveValue Nearest NearestFunction NeedCurrentFrontEndPackagePacket NeedCurrentFrontEndSymbolsPacket NeedlemanWunschSimilarity Needs Negative NegativeBinomialDistribution NegativeMultinomialDistribution NeighborhoodGraph Nest NestedGreaterGreater NestedLessLess NestedScriptRules NestList NestWhile NestWhileList NevilleThetaC NevilleThetaD NevilleThetaN NevilleThetaS NewPrimitiveStyle NExpectation Next NextPrime NHoldAll NHoldFirst NHoldRest NicholsGridLines NicholsPlot NIntegrate NMaximize NMaxValue NMinimize NMinValue NominalVariables NonAssociative NoncentralBetaDistribution NoncentralChiSquareDistribution NoncentralFRatioDistribution NoncentralStudentTDistribution NonCommutativeMultiply NonConstants None NonlinearModelFit NonlocalMeansFilter NonNegative NonPositive Nor NorlundB Norm Normal NormalDistribution NormalGrouping Normalize NormalizedSquaredEuclideanDistance NormalsFunction NormFunction Not NotCongruent NotCupCap NotDoubleVerticalBar Notebook NotebookApply NotebookAutoSave NotebookClose NotebookConvertSettings NotebookCreate NotebookCreateReturnObject NotebookDefault NotebookDelete NotebookDirectory NotebookDynamicExpression NotebookEvaluate NotebookEventActions NotebookFileName NotebookFind NotebookFindReturnObject NotebookGet NotebookGetLayoutInformationPacket NotebookGetMisspellingsPacket NotebookInformation NotebookInterfaceObject NotebookLocate NotebookObject NotebookOpen NotebookOpenReturnObject NotebookPath NotebookPrint NotebookPut NotebookPutReturnObject NotebookRead NotebookResetGeneratedCells Notebooks NotebookSave NotebookSaveAs NotebookSelection NotebookSetupLayoutInformationPacket NotebooksMenu NotebookWrite NotElement NotEqualTilde NotExists NotGreater NotGreaterEqual NotGreaterFullEqual NotGreaterGreater NotGreaterLess NotGreaterSlantEqual NotGreaterTilde NotHumpDownHump NotHumpEqual NotLeftTriangle NotLeftTriangleBar NotLeftTriangleEqual NotLess NotLessEqual NotLessFullEqual NotLessGreater NotLessLess NotLessSlantEqual NotLessTilde NotNestedGreaterGreater NotNestedLessLess NotPrecedes NotPrecedesEqual NotPrecedesSlantEqual NotPrecedesTilde NotReverseElement NotRightTriangle NotRightTriangleBar NotRightTriangleEqual NotSquareSubset NotSquareSubsetEqual NotSquareSuperset NotSquareSupersetEqual NotSubset NotSubsetEqual NotSucceeds NotSucceedsEqual NotSucceedsSlantEqual NotSucceedsTilde NotSuperset NotSupersetEqual NotTilde NotTildeEqual NotTildeFullEqual NotTildeTilde NotVerticalBar NProbability NProduct NProductFactors NRoots NSolve NSum NSumTerms Null NullRecords NullSpace NullWords Number NumberFieldClassNumber NumberFieldDiscriminant NumberFieldFundamentalUnits NumberFieldIntegralBasis NumberFieldNormRepresentatives NumberFieldRegulator NumberFieldRootsOfUnity NumberFieldSignature NumberForm NumberFormat NumberMarks NumberMultiplier NumberPadding NumberPoint NumberQ NumberSeparator ' +
      'NumberSigns NumberString Numerator NumericFunction NumericQ NuttallWindow NValues NyquistGridLines NyquistPlot ' +
      'O ObservabilityGramian ObservabilityMatrix ObservableDecomposition ObservableModelQ OddQ Off Offset OLEData On ONanGroupON OneIdentity Opacity Open OpenAppend Opener OpenerBox OpenerBoxOptions OpenerView OpenFunctionInspectorPacket Opening OpenRead OpenSpecialOptions OpenTemporary OpenWrite Operate OperatingSystem OptimumFlowData Optional OptionInspectorSettings OptionQ Options OptionsPacket OptionsPattern OptionValue OptionValueBox OptionValueBoxOptions Or Orange Order OrderDistribution OrderedQ Ordering Orderless OrnsteinUhlenbeckProcess Orthogonalize Out Outer OutputAutoOverwrite OutputControllabilityMatrix OutputControllableModelQ OutputForm OutputFormData OutputGrouping OutputMathEditExpression OutputNamePacket OutputResponse OutputSizeLimit OutputStream Over OverBar OverDot Overflow OverHat Overlaps Overlay OverlayBox OverlayBoxOptions Overscript OverscriptBox OverscriptBoxOptions OverTilde OverVector OwenT OwnValues ' +
      'PackingMethod PaddedForm Padding PadeApproximant PadLeft PadRight PageBreakAbove PageBreakBelow PageBreakWithin PageFooterLines PageFooters PageHeaderLines PageHeaders PageHeight PageRankCentrality PageWidth PairedBarChart PairedHistogram PairedSmoothHistogram PairedTTest PairedZTest PaletteNotebook PalettePath Pane PaneBox PaneBoxOptions Panel PanelBox PanelBoxOptions Paneled PaneSelector PaneSelectorBox PaneSelectorBoxOptions PaperWidth ParabolicCylinderD ParagraphIndent ParagraphSpacing ParallelArray ParallelCombine ParallelDo ParallelEvaluate Parallelization Parallelize ParallelMap ParallelNeeds ParallelProduct ParallelSubmit ParallelSum ParallelTable ParallelTry Parameter ParameterEstimator ParameterMixtureDistribution ParameterVariables ParametricFunction ParametricNDSolve ParametricNDSolveValue ParametricPlot ParametricPlot3D ParentConnect ParentDirectory ParentForm Parenthesize ParentList ParetoDistribution Part PartialCorrelationFunction PartialD ParticleData Partition PartitionsP PartitionsQ ParzenWindow PascalDistribution PassEventsDown PassEventsUp Paste PasteBoxFormInlineCells PasteButton Path PathGraph PathGraphQ Pattern PatternSequence PatternTest PauliMatrix PaulWavelet Pause PausedTime PDF PearsonChiSquareTest PearsonCorrelationTest PearsonDistribution PerformanceGoal PeriodicInterpolation Periodogram PeriodogramArray PermutationCycles PermutationCyclesQ PermutationGroup PermutationLength PermutationList PermutationListQ PermutationMax PermutationMin PermutationOrder PermutationPower PermutationProduct PermutationReplace Permutations PermutationSupport Permute PeronaMalikFilter Perpendicular PERTDistribution PetersenGraph PhaseMargins Pi Pick PIDData PIDDerivativeFilter PIDFeedforward PIDTune Piecewise PiecewiseExpand PieChart PieChart3D PillaiTrace PillaiTraceTest Pink Pivoting PixelConstrained PixelValue PixelValuePositions Placed Placeholder PlaceholderReplace Plain PlanarGraphQ Play PlayRange Plot Plot3D Plot3Matrix PlotDivision PlotJoined PlotLabel PlotLayout PlotLegends PlotMarkers PlotPoints PlotRange PlotRangeClipping PlotRangePadding PlotRegion PlotStyle Plus PlusMinus Pochhammer PodStates PodWidth Point Point3DBox PointBox PointFigureChart PointForm PointLegend PointSize PoissonConsulDistribution PoissonDistribution PoissonProcess PoissonWindow PolarAxes PolarAxesOrigin PolarGridLines PolarPlot PolarTicks PoleZeroMarkers PolyaAeppliDistribution PolyGamma Polygon Polygon3DBox Polygon3DBoxOptions PolygonBox PolygonBoxOptions PolygonHoleScale PolygonIntersections PolygonScale PolyhedronData PolyLog PolynomialExtendedGCD PolynomialForm PolynomialGCD PolynomialLCM PolynomialMod PolynomialQ PolynomialQuotient PolynomialQuotientRemainder PolynomialReduce PolynomialRemainder Polynomials PopupMenu PopupMenuBox PopupMenuBoxOptions PopupView PopupWindow Position Positive PositiveDefiniteMatrixQ PossibleZeroQ Postfix PostScript Power PowerDistribution PowerExpand PowerMod PowerModList ' +
      'PowerSpectralDensity PowersRepresentations PowerSymmetricPolynomial Precedence PrecedenceForm Precedes PrecedesEqual PrecedesSlantEqual PrecedesTilde Precision PrecisionGoal PreDecrement PredictionRoot PreemptProtect PreferencesPath Prefix PreIncrement Prepend PrependTo PreserveImageOptions Previous PriceGraphDistribution PrimaryPlaceholder Prime PrimeNu PrimeOmega PrimePi PrimePowerQ PrimeQ Primes PrimeZetaP PrimitiveRoot PrincipalComponents PrincipalValue Print PrintAction PrintForm PrintingCopies PrintingOptions PrintingPageRange PrintingStartingPageNumber PrintingStyleEnvironment PrintPrecision PrintTemporary Prism PrismBox PrismBoxOptions PrivateCellOptions PrivateEvaluationOptions PrivateFontOptions PrivateFrontEndOptions PrivateNotebookOptions PrivatePaths Probability ProbabilityDistribution ProbabilityPlot ProbabilityPr ProbabilityScalePlot ProbitModelFit ProcessEstimator ProcessParameterAssumptions ProcessParameterQ ProcessStateDomain ProcessTimeDomain Product ProductDistribution ProductLog ProgressIndicator ProgressIndicatorBox ProgressIndicatorBoxOptions Projection Prolog PromptForm Properties Property PropertyList PropertyValue Proportion Proportional Protect Protected ProteinData Pruning PseudoInverse Purple Put PutAppend Pyramid PyramidBox PyramidBoxOptions ' +
      'QBinomial QFactorial QGamma QHypergeometricPFQ QPochhammer QPolyGamma QRDecomposition QuadraticIrrationalQ Quantile QuantilePlot Quantity QuantityForm QuantityMagnitude QuantityQ QuantityUnit Quartics QuartileDeviation Quartiles QuartileSkewness QueueingNetworkProcess QueueingProcess QueueProperties Quiet Quit Quotient QuotientRemainder ' +
      'RadialityCentrality RadicalBox RadicalBoxOptions RadioButton RadioButtonBar RadioButtonBox RadioButtonBoxOptions Radon RamanujanTau RamanujanTauL RamanujanTauTheta RamanujanTauZ Random RandomChoice RandomComplex RandomFunction RandomGraph RandomImage RandomInteger RandomPermutation RandomPrime RandomReal RandomSample RandomSeed RandomVariate RandomWalkProcess Range RangeFilter RangeSpecification RankedMax RankedMin Raster Raster3D Raster3DBox Raster3DBoxOptions RasterArray RasterBox RasterBoxOptions Rasterize RasterSize Rational RationalFunctions Rationalize Rationals Ratios Raw RawArray RawBoxes RawData RawMedium RayleighDistribution Re Read ReadList ReadProtected Real RealBlockDiagonalForm RealDigits RealExponent Reals Reap Record RecordLists RecordSeparators Rectangle RectangleBox RectangleBoxOptions RectangleChart RectangleChart3D RecurrenceFilter RecurrenceTable RecurringDigitsForm Red Reduce RefBox ReferenceLineStyle ReferenceMarkers ReferenceMarkerStyle Refine ReflectionMatrix ReflectionTransform Refresh RefreshRate RegionBinarize RegionFunction RegionPlot RegionPlot3D RegularExpression Regularization Reinstall Release ReleaseHold ReliabilityDistribution ReliefImage ReliefPlot Remove RemoveAlphaChannel RemoveAsynchronousTask Removed RemoveInputStreamMethod RemoveOutputStreamMethod RemoveProperty RemoveScheduledTask RenameDirectory RenameFile RenderAll RenderingOptions RenewalProcess RenkoChart Repeated RepeatedNull RepeatedString Replace ReplaceAll ReplaceHeldPart ReplaceImageValue ReplaceList ReplacePart ReplacePixelValue ReplaceRepeated Resampling Rescale RescalingTransform ResetDirectory ResetMenusPacket ResetScheduledTask Residue Resolve Rest Resultant ResumePacket Return ReturnExpressionPacket ReturnInputFormPacket ReturnPacket ReturnTextPacket Reverse ReverseBiorthogonalSplineWavelet ReverseElement ReverseEquilibrium ReverseGraph ReverseUpEquilibrium RevolutionAxis RevolutionPlot3D RGBColor RiccatiSolve RiceDistribution RidgeFilter RiemannR RiemannSiegelTheta RiemannSiegelZ Riffle Right RightArrow RightArrowBar RightArrowLeftArrow RightCosetRepresentative RightDownTeeVector RightDownVector RightDownVectorBar RightTee RightTeeArrow RightTeeVector RightTriangle RightTriangleBar RightTriangleEqual RightUpDownVector RightUpTeeVector RightUpVector RightUpVectorBar RightVector RightVectorBar RiskAchievementImportance RiskReductionImportance RogersTanimotoDissimilarity Root RootApproximant RootIntervals RootLocusPlot RootMeanSquare RootOfUnityQ RootReduce Roots RootSum Rotate RotateLabel RotateLeft RotateRight RotationAction RotationBox RotationBoxOptions RotationMatrix RotationTransform Round RoundImplies RoundingRadius Row RowAlignments RowBackgrounds RowBox RowHeights RowLines RowMinHeight RowReduce RowsEqual RowSpacings RSolve RudvalisGroupRu Rule RuleCondition RuleDelayed RuleForm RulerUnits Run RunScheduledTask RunThrough RuntimeAttributes RuntimeOptions RussellRaoDissimilarity ' +
      'SameQ SameTest SampleDepth SampledSoundFunction SampledSoundList SampleRate SamplingPeriod SARIMAProcess SARMAProcess SatisfiabilityCount SatisfiabilityInstances SatisfiableQ Saturday Save Saveable SaveAutoDelete SaveDefinitions SawtoothWave Scale Scaled ScaleDivisions ScaledMousePosition ScaleOrigin ScalePadding ScaleRanges ScaleRangeStyle ScalingFunctions ScalingMatrix ScalingTransform Scan ScheduledTaskActiveQ ScheduledTaskData ScheduledTaskObject ScheduledTasks SchurDecomposition ScientificForm ScreenRectangle ScreenStyleEnvironment ScriptBaselineShifts ScriptLevel ScriptMinSize ScriptRules ScriptSizeMultipliers Scrollbars ScrollingOptions ScrollPosition Sec Sech SechDistribution SectionGrouping SectorChart SectorChart3D SectorOrigin SectorSpacing SeedRandom Select Selectable SelectComponents SelectedCells SelectedNotebook Selection SelectionAnimate SelectionCell SelectionCellCreateCell SelectionCellDefaultStyle SelectionCellParentStyle SelectionCreateCell SelectionDebuggerTag SelectionDuplicateCell SelectionEvaluate SelectionEvaluateCreateCell SelectionMove SelectionPlaceholder SelectionSetStyle SelectWithContents SelfLoops SelfLoopStyle SemialgebraicComponentInstances SendMail Sequence SequenceAlignment SequenceForm SequenceHold SequenceLimit Series SeriesCoefficient SeriesData SessionTime Set SetAccuracy SetAlphaChannel SetAttributes Setbacks SetBoxFormNamesPacket SetDelayed SetDirectory SetEnvironment SetEvaluationNotebook SetFileDate SetFileLoadingContext SetNotebookStatusLine SetOptions SetOptionsPacket SetPrecision SetProperty SetSelectedNotebook SetSharedFunction SetSharedVariable SetSpeechParametersPacket SetStreamPosition SetSystemOptions Setter SetterBar SetterBox SetterBoxOptions Setting SetValue Shading Shallow ShannonWavelet ShapiroWilkTest Share Sharpen ShearingMatrix ShearingTransform ShenCastanMatrix Short ShortDownArrow Shortest ShortestMatch ShortestPathFunction ShortLeftArrow ShortRightArrow ShortUpArrow Show ShowAutoStyles ShowCellBracket ShowCellLabel ShowCellTags ShowClosedCellArea ShowContents ShowControls ShowCursorTracker ShowGroupOpenCloseIcon ShowGroupOpener ShowInvisibleCharacters ShowPageBreaks ShowPredictiveInterface ShowSelection ShowShortBoxForm ShowSpecialCharacters ShowStringCharacters ShowSyntaxStyles ShrinkingDelay ShrinkWrapBoundingBox SiegelTheta SiegelTukeyTest Sign Signature SignedRankTest SignificanceLevel SignPadding SignTest SimilarityRules SimpleGraph SimpleGraphQ Simplify Sin Sinc SinghMaddalaDistribution SingleEvaluation SingleLetterItalics SingleLetterStyle SingularValueDecomposition SingularValueList SingularValuePlot SingularValues Sinh SinhIntegral SinIntegral SixJSymbol Skeleton SkeletonTransform SkellamDistribution Skewness SkewNormalDistribution Skip SliceDistribution Slider Slider2D Slider2DBox Slider2DBoxOptions SliderBox SliderBoxOptions SlideView Slot SlotSequence Small SmallCircle Smaller SmithDelayCompensator SmithWatermanSimilarity ' +
      'SmoothDensityHistogram SmoothHistogram SmoothHistogram3D SmoothKernelDistribution SocialMediaData Socket SokalSneathDissimilarity Solve SolveAlways SolveDelayed Sort SortBy Sound SoundAndGraphics SoundNote SoundVolume Sow Space SpaceForm Spacer Spacings Span SpanAdjustments SpanCharacterRounding SpanFromAbove SpanFromBoth SpanFromLeft SpanLineThickness SpanMaxSize SpanMinSize SpanningCharacters SpanSymmetric SparseArray SpatialGraphDistribution Speak SpeakTextPacket SpearmanRankTest SpearmanRho Spectrogram SpectrogramArray Specularity SpellingCorrection SpellingDictionaries SpellingDictionariesPath SpellingOptions SpellingSuggestionsPacket Sphere SphereBox SphericalBesselJ SphericalBesselY SphericalHankelH1 SphericalHankelH2 SphericalHarmonicY SphericalPlot3D SphericalRegion SpheroidalEigenvalue SpheroidalJoiningFactor SpheroidalPS SpheroidalPSPrime SpheroidalQS SpheroidalQSPrime SpheroidalRadialFactor SpheroidalS1 SpheroidalS1Prime SpheroidalS2 SpheroidalS2Prime Splice SplicedDistribution SplineClosed SplineDegree SplineKnots SplineWeights Split SplitBy SpokenString Sqrt SqrtBox SqrtBoxOptions Square SquaredEuclideanDistance SquareFreeQ SquareIntersection SquaresR SquareSubset SquareSubsetEqual SquareSuperset SquareSupersetEqual SquareUnion SquareWave StabilityMargins StabilityMarginsStyle StableDistribution Stack StackBegin StackComplete StackInhibit StandardDeviation StandardDeviationFilter StandardForm Standardize StandbyDistribution Star StarGraph StartAsynchronousTask StartingStepSize StartOfLine StartOfString StartScheduledTask StartupSound StateDimensions StateFeedbackGains StateOutputEstimator StateResponse StateSpaceModel StateSpaceRealization StateSpaceTransform StationaryDistribution StationaryWaveletPacketTransform StationaryWaveletTransform StatusArea StatusCentrality StepMonitor StieltjesGamma StirlingS1 StirlingS2 StopAsynchronousTask StopScheduledTask StrataVariables StratonovichProcess StreamColorFunction StreamColorFunctionScaling StreamDensityPlot StreamPlot StreamPoints StreamPosition Streams StreamScale StreamStyle String StringBreak StringByteCount StringCases StringCount StringDrop StringExpression StringForm StringFormat StringFreeQ StringInsert StringJoin StringLength StringMatchQ StringPosition StringQ StringReplace StringReplaceList StringReplacePart StringReverse StringRotateLeft StringRotateRight StringSkeleton StringSplit StringTake StringToStream StringTrim StripBoxes StripOnInput StripWrapperBoxes StrokeForm StructuralImportance StructuredArray StructuredSelection StruveH StruveL Stub StudentTDistribution Style StyleBox StyleBoxAutoDelete StyleBoxOptions StyleData StyleDefinitions StyleForm StyleKeyMapping StyleMenuListing StyleNameDialogSettings StyleNames StylePrint StyleSheetPath Subfactorial Subgraph SubMinus SubPlus SubresultantPolynomialRemainders ' +
      'SubresultantPolynomials Subresultants Subscript SubscriptBox SubscriptBoxOptions Subscripted Subset SubsetEqual Subsets SubStar Subsuperscript SubsuperscriptBox SubsuperscriptBoxOptions Subtract SubtractFrom SubValues Succeeds SucceedsEqual SucceedsSlantEqual SucceedsTilde SuchThat Sum SumConvergence Sunday SuperDagger SuperMinus SuperPlus Superscript SuperscriptBox SuperscriptBoxOptions Superset SupersetEqual SuperStar Surd SurdForm SurfaceColor SurfaceGraphics SurvivalDistribution SurvivalFunction SurvivalModel SurvivalModelFit SuspendPacket SuzukiDistribution SuzukiGroupSuz SwatchLegend Switch Symbol SymbolName SymletWavelet Symmetric SymmetricGroup SymmetricMatrixQ SymmetricPolynomial SymmetricReduction Symmetrize SymmetrizedArray SymmetrizedArrayRules SymmetrizedDependentComponents SymmetrizedIndependentComponents SymmetrizedReplacePart SynchronousInitialization SynchronousUpdating Syntax SyntaxForm SyntaxInformation SyntaxLength SyntaxPacket SyntaxQ SystemDialogInput SystemException SystemHelpPath SystemInformation SystemInformationData SystemOpen SystemOptions SystemsModelDelay SystemsModelDelayApproximate SystemsModelDelete SystemsModelDimensions SystemsModelExtract SystemsModelFeedbackConnect SystemsModelLabels SystemsModelOrder SystemsModelParallelConnect SystemsModelSeriesConnect SystemsModelStateFeedbackConnect SystemStub ' +
      'Tab TabFilling Table TableAlignments TableDepth TableDirections TableForm TableHeadings TableSpacing TableView TableViewBox TabSpacings TabView TabViewBox TabViewBoxOptions TagBox TagBoxNote TagBoxOptions TaggingRules TagSet TagSetDelayed TagStyle TagUnset Take TakeWhile Tally Tan Tanh TargetFunctions TargetUnits TautologyQ TelegraphProcess TemplateBox TemplateBoxOptions TemplateSlotSequence TemporalData Temporary TemporaryVariable TensorContract TensorDimensions TensorExpand TensorProduct TensorQ TensorRank TensorReduce TensorSymmetry TensorTranspose TensorWedge Tetrahedron TetrahedronBox TetrahedronBoxOptions TeXForm TeXSave Text Text3DBox Text3DBoxOptions TextAlignment TextBand TextBoundingBox TextBox TextCell TextClipboardType TextData TextForm TextJustification TextLine TextPacket TextParagraph TextRecognize TextRendering TextStyle Texture TextureCoordinateFunction TextureCoordinateScaling Therefore ThermometerGauge Thick Thickness Thin Thinning ThisLink ThompsonGroupTh Thread ThreeJSymbol Threshold Through Throw Thumbnail Thursday Ticks TicksStyle Tilde TildeEqual TildeFullEqual TildeTilde TimeConstrained TimeConstraint Times TimesBy TimeSeriesForecast TimeSeriesInvertibility TimeUsed TimeValue TimeZone Timing Tiny TitleGrouping TitsGroupT ToBoxes ToCharacterCode ToColor ToContinuousTimeModel ToDate ToDiscreteTimeModel ToeplitzMatrix ToExpression ToFileName Together Toggle ToggleFalse Toggler TogglerBar TogglerBox TogglerBoxOptions ToHeldExpression ToInvertibleTimeSeries TokenWords Tolerance ToLowerCase ToNumberField TooBig Tooltip TooltipBox TooltipBoxOptions TooltipDelay TooltipStyle Top TopHatTransform TopologicalSort ToRadicals ToRules ToString Total TotalHeight TotalVariationFilter TotalWidth TouchscreenAutoZoom TouchscreenControlPlacement ToUpperCase Tr Trace TraceAbove TraceAction TraceBackward TraceDepth TraceDialog TraceForward TraceInternal TraceLevel TraceOff TraceOn TraceOriginal TracePrint TraceScan TrackedSymbols TradingChart TraditionalForm TraditionalFunctionNotation TraditionalNotation TraditionalOrder TransferFunctionCancel TransferFunctionExpand TransferFunctionFactor TransferFunctionModel TransferFunctionPoles TransferFunctionTransform TransferFunctionZeros TransformationFunction TransformationFunctions TransformationMatrix TransformedDistribution TransformedField Translate TranslationTransform TransparentColor Transpose TreeForm TreeGraph TreeGraphQ TreePlot TrendStyle TriangleWave TriangularDistribution Trig TrigExpand TrigFactor TrigFactorList Trigger TrigReduce TrigToExp TrimmedMean True TrueQ TruncatedDistribution TsallisQExponentialDistribution TsallisQGaussianDistribution TTest Tube TubeBezierCurveBox TubeBezierCurveBoxOptions TubeBox TubeBSplineCurveBox TubeBSplineCurveBoxOptions Tuesday TukeyLambdaDistribution TukeyWindow Tuples TuranGraph TuringMachine ' +
      'Transparent ' +
      'UnateQ Uncompress Undefined UnderBar Underflow Underlined Underoverscript UnderoverscriptBox UnderoverscriptBoxOptions Underscript UnderscriptBox UnderscriptBoxOptions UndirectedEdge UndirectedGraph UndirectedGraphQ UndocumentedTestFEParserPacket UndocumentedTestGetSelectionPacket Unequal Unevaluated UniformDistribution UniformGraphDistribution UniformSumDistribution Uninstall Union UnionPlus Unique UnitBox UnitConvert UnitDimensions Unitize UnitRootTest UnitSimplify UnitStep UnitTriangle UnitVector Unprotect UnsameQ UnsavedVariables Unset UnsetShared UntrackedVariables Up UpArrow UpArrowBar UpArrowDownArrow Update UpdateDynamicObjects UpdateDynamicObjectsSynchronous UpdateInterval UpDownArrow UpEquilibrium UpperCaseQ UpperLeftArrow UpperRightArrow UpperTriangularize Upsample UpSet UpSetDelayed UpTee UpTeeArrow UpValues URL URLFetch URLFetchAsynchronous URLSave URLSaveAsynchronous UseGraphicsRange Using UsingFrontEnd ' +
      'V2Get ValidationLength Value ValueBox ValueBoxOptions ValueForm ValueQ ValuesData Variables Variance VarianceEquivalenceTest VarianceEstimatorFunction VarianceGammaDistribution VarianceTest VectorAngle VectorColorFunction VectorColorFunctionScaling VectorDensityPlot VectorGlyphData VectorPlot VectorPlot3D VectorPoints VectorQ Vectors VectorScale VectorStyle Vee Verbatim Verbose VerboseConvertToPostScriptPacket VerifyConvergence VerifySolutions VerifyTestAssumptions Version VersionNumber VertexAdd VertexCapacity VertexColors VertexComponent VertexConnectivity VertexCoordinateRules VertexCoordinates VertexCorrelationSimilarity VertexCosineSimilarity VertexCount VertexCoverQ VertexDataCoordinates VertexDegree VertexDelete VertexDiceSimilarity VertexEccentricity VertexInComponent VertexInDegree VertexIndex VertexJaccardSimilarity VertexLabeling VertexLabels VertexLabelStyle VertexList VertexNormals VertexOutComponent VertexOutDegree VertexQ VertexRenderingFunction VertexReplace VertexShape VertexShapeFunction VertexSize VertexStyle VertexTextureCoordinates VertexWeight Vertical VerticalBar VerticalForm VerticalGauge VerticalSeparator VerticalSlider VerticalTilde ViewAngle ViewCenter ViewMatrix ViewPoint ViewPointSelectorSettings ViewPort ViewRange ViewVector ViewVertical VirtualGroupData Visible VisibleCell VoigtDistribution VonMisesDistribution ' +
      'WaitAll WaitAsynchronousTask WaitNext WaitUntil WakebyDistribution WalleniusHypergeometricDistribution WaringYuleDistribution WatershedComponents WatsonUSquareTest WattsStrogatzGraphDistribution WaveletBestBasis WaveletFilterCoefficients WaveletImagePlot WaveletListPlot WaveletMapIndexed WaveletMatrixPlot WaveletPhi WaveletPsi WaveletScale WaveletScalogram WaveletThreshold WeaklyConnectedComponents WeaklyConnectedGraphQ WeakStationarity WeatherData WeberE Wedge Wednesday WeibullDistribution WeierstrassHalfPeriods WeierstrassInvariants WeierstrassP WeierstrassPPrime WeierstrassSigma WeierstrassZeta WeightedAdjacencyGraph WeightedAdjacencyMatrix WeightedData WeightedGraphQ Weights WelchWindow WheelGraph WhenEvent Which While White Whitespace WhitespaceCharacter WhittakerM WhittakerW WienerFilter WienerProcess WignerD WignerSemicircleDistribution WilksW WilksWTest WindowClickSelect WindowElements WindowFloating WindowFrame WindowFrameElements WindowMargins WindowMovable WindowOpacity WindowSelected WindowSize WindowStatusArea WindowTitle WindowToolbars WindowWidth With WolframAlpha WolframAlphaDate WolframAlphaQuantity WolframAlphaResult Word WordBoundary WordCharacter WordData WordSearch WordSeparators WorkingPrecision Write WriteString Wronskian ' +
      'XMLElement XMLObject Xnor Xor ' +
      'Yellow YuleDissimilarity ' +
      'ZernikeR ZeroSymmetric ZeroTest ZeroWidthTimes Zeta ZetaZero ZipfDistribution ZTest ZTransform ' +
      '$Aborted $ActivationGroupID $ActivationKey $ActivationUserRegistered $AddOnsDirectory $AssertFunction $Assumptions $AsynchronousTask $BaseDirectory $BatchInput $BatchOutput $BoxForms $ByteOrdering $Canceled $CharacterEncoding $CharacterEncodings $CommandLine $CompilationTarget $ConditionHold $ConfiguredKernels $Context $ContextPath $ControlActiveSetting $CreationDate $CurrentLink $DateStringFormat $DefaultFont $DefaultFrontEnd $DefaultImagingDevice $DefaultPath $Display $DisplayFunction $DistributedContexts $DynamicEvaluation $Echo $Epilog $ExportFormats $Failed $FinancialDataSource $FormatType $FrontEnd $FrontEndSession $GeoLocation $HistoryLength $HomeDirectory $HTTPCookies $IgnoreEOF $ImagingDevices $ImportFormats $InitialDirectory $Input $InputFileName $InputStreamMethods $Inspector $InstallationDate $InstallationDirectory $InterfaceEnvironment $IterationLimit $KernelCount $KernelID $Language $LaunchDirectory $LibraryPath $LicenseExpirationDate $LicenseID $LicenseProcesses $LicenseServer $LicenseSubprocesses $LicenseType $Line $Linked $LinkSupported $LoadedFiles $MachineAddresses $MachineDomain $MachineDomains $MachineEpsilon $MachineID $MachineName $MachinePrecision $MachineType $MaxExtraPrecision $MaxLicenseProcesses $MaxLicenseSubprocesses $MaxMachineNumber $MaxNumber $MaxPiecewiseCases $MaxPrecision $MaxRootDegree $MessageGroups $MessageList $MessagePrePrint $Messages $MinMachineNumber $MinNumber $MinorReleaseNumber $MinPrecision $ModuleNumber $NetworkLicense $NewMessage $NewSymbol $Notebooks $NumberMarks $Off $OperatingSystem $Output $OutputForms $OutputSizeLimit $OutputStreamMethods $Packages $ParentLink $ParentProcessID $PasswordFile $PatchLevelID $Path $PathnameSeparator $PerformanceGoal $PipeSupported $Post $Pre $PreferencesDirectory $PrePrint $PreRead $PrintForms $PrintLiteral $ProcessID $ProcessorCount $ProcessorType $ProductInformation $ProgramName $RandomState $RecursionLimit $ReleaseNumber $RootDirectory $ScheduledTask $ScriptCommandLine $SessionID $SetParentLink $SharedFunctions $SharedVariables $SoundDisplay $SoundDisplayFunction $SuppressInputFormHeads $SynchronousEvaluation $SyntaxHandler $System $SystemCharacterEncoding $SystemID $SystemWordLength $TemporaryDirectory $TemporaryPrefix $TextStyle $TimedOut $TimeUnit $TimeZone $TopDirectory $TraceOff $TraceOn $TracePattern $TracePostAction $TracePreAction $Urgent $UserAddOnsDirectory $UserBaseDirectory $UserDocumentsDirectory $UserName $Version $VersionNumber',
    contains: [
      {
        className: "comment",
        begin: /\(\*/, end: /\*\)/
      },
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE,
      hljs.C_NUMBER_MODE,
      {
        className: 'list',
        begin: /\{/, end: /\}/,
        illegal: /:/
      }
    ]
  };
};
},{}],81:[function(require,module,exports){
module.exports = function(hljs) {
  var COMMON_CONTAINS = [
    hljs.C_NUMBER_MODE,
    {
      className: 'string',
      begin: '\'', end: '\'',
      contains: [hljs.BACKSLASH_ESCAPE, {begin: '\'\''}]
    }
  ];
  var TRANSPOSE = {
    relevance: 0,
    contains: [
      {
        className: 'operator', begin: /'['\.]*/
      }
    ]
  };

  return {
    keywords: {
      keyword:
        'break case catch classdef continue else elseif end enumerated events for function ' +
        'global if methods otherwise parfor persistent properties return spmd switch try while',
      built_in:
        'sin sind sinh asin asind asinh cos cosd cosh acos acosd acosh tan tand tanh atan ' +
        'atand atan2 atanh sec secd sech asec asecd asech csc cscd csch acsc acscd acsch cot ' +
        'cotd coth acot acotd acoth hypot exp expm1 log log1p log10 log2 pow2 realpow reallog ' +
        'realsqrt sqrt nthroot nextpow2 abs angle complex conj imag real unwrap isreal ' +
        'cplxpair fix floor ceil round mod rem sign airy besselj bessely besselh besseli ' +
        'besselk beta betainc betaln ellipj ellipke erf erfc erfcx erfinv expint gamma ' +
        'gammainc gammaln psi legendre cross dot factor isprime primes gcd lcm rat rats perms ' +
        'nchoosek factorial cart2sph cart2pol pol2cart sph2cart hsv2rgb rgb2hsv zeros ones ' +
        'eye repmat rand randn linspace logspace freqspace meshgrid accumarray size length ' +
        'ndims numel disp isempty isequal isequalwithequalnans cat reshape diag blkdiag tril ' +
        'triu fliplr flipud flipdim rot90 find sub2ind ind2sub bsxfun ndgrid permute ipermute ' +
        'shiftdim circshift squeeze isscalar isvector ans eps realmax realmin pi i inf nan ' +
        'isnan isinf isfinite j why compan gallery hadamard hankel hilb invhilb magic pascal ' +
        'rosser toeplitz vander wilkinson'
    },
    illegal: '(//|"|#|/\\*|\\s+/\\w+)',
    contains: [
      {
        className: 'function',
        beginKeywords: 'function', end: '$',
        contains: [
          hljs.UNDERSCORE_TITLE_MODE,
          {
              className: 'params',
              begin: '\\(', end: '\\)'
          },
          {
              className: 'params',
              begin: '\\[', end: '\\]'
          }
        ]
      },
      {
        begin: /[a-zA-Z_][a-zA-Z_0-9]*'['\.]*/,
        returnBegin: true,
        relevance: 0,
        contains: [
          {begin: /[a-zA-Z_][a-zA-Z_0-9]*/, relevance: 0},
          TRANSPOSE.contains[0]
        ]
      },
      {
        className: 'matrix',
        begin: '\\[', end: '\\]',
        contains: COMMON_CONTAINS,
        relevance: 0,
        starts: TRANSPOSE
      },
      {
        className: 'cell',
        begin: '\\{', end: /}/,
        contains: COMMON_CONTAINS,
        relevance: 0,
        starts: TRANSPOSE
      },
      {
        // transpose operators at the end of a function call
        begin: /\)/,
        relevance: 0,
        starts: TRANSPOSE
      },
      hljs.COMMENT('^\\s*\\%\\{\\s*$', '^\\s*\\%\\}\\s*$'),
      hljs.COMMENT('\\%', '$')
    ].concat(COMMON_CONTAINS)
  };
};
},{}],82:[function(require,module,exports){
module.exports = function(hljs) {
  return {
    keywords:
      'int float string vector matrix if else switch case default while do for in break ' +
      'continue global proc return about abs addAttr addAttributeEditorNodeHelp addDynamic ' +
      'addNewShelfTab addPP addPanelCategory addPrefixToName advanceToNextDrivenKey ' +
      'affectedNet affects aimConstraint air alias aliasAttr align alignCtx alignCurve ' +
      'alignSurface allViewFit ambientLight angle angleBetween animCone animCurveEditor ' +
      'animDisplay animView annotate appendStringArray applicationName applyAttrPreset ' +
      'applyTake arcLenDimContext arcLengthDimension arclen arrayMapper art3dPaintCtx ' +
      'artAttrCtx artAttrPaintVertexCtx artAttrSkinPaintCtx artAttrTool artBuildPaintMenu ' +
      'artFluidAttrCtx artPuttyCtx artSelectCtx artSetPaintCtx artUserPaintCtx assignCommand ' +
      'assignInputDevice assignViewportFactories attachCurve attachDeviceAttr attachSurface ' +
      'attrColorSliderGrp attrCompatibility attrControlGrp attrEnumOptionMenu ' +
      'attrEnumOptionMenuGrp attrFieldGrp attrFieldSliderGrp attrNavigationControlGrp ' +
      'attrPresetEditWin attributeExists attributeInfo attributeMenu attributeQuery ' +
      'autoKeyframe autoPlace bakeClip bakeFluidShading bakePartialHistory bakeResults ' +
      'bakeSimulation basename basenameEx batchRender bessel bevel bevelPlus binMembership ' +
      'bindSkin blend2 blendShape blendShapeEditor blendShapePanel blendTwoAttr blindDataType ' +
      'boneLattice boundary boxDollyCtx boxZoomCtx bufferCurve buildBookmarkMenu ' +
      'buildKeyframeMenu button buttonManip CBG cacheFile cacheFileCombine cacheFileMerge ' +
      'cacheFileTrack camera cameraView canCreateManip canvas capitalizeString catch ' +
      'catchQuiet ceil changeSubdivComponentDisplayLevel changeSubdivRegion channelBox ' +
      'character characterMap characterOutlineEditor characterize chdir checkBox checkBoxGrp ' +
      'checkDefaultRenderGlobals choice circle circularFillet clamp clear clearCache clip ' +
      'clipEditor clipEditorCurrentTimeCtx clipSchedule clipSchedulerOutliner clipTrimBefore ' +
      'closeCurve closeSurface cluster cmdFileOutput cmdScrollFieldExecuter ' +
      'cmdScrollFieldReporter cmdShell coarsenSubdivSelectionList collision color ' +
      'colorAtPoint colorEditor colorIndex colorIndexSliderGrp colorSliderButtonGrp ' +
      'colorSliderGrp columnLayout commandEcho commandLine commandPort compactHairSystem ' +
      'componentEditor compositingInterop computePolysetVolume condition cone confirmDialog ' +
      'connectAttr connectControl connectDynamic connectJoint connectionInfo constrain ' +
      'constrainValue constructionHistory container containsMultibyte contextInfo control ' +
      'convertFromOldLayers convertIffToPsd convertLightmap convertSolidTx convertTessellation ' +
      'convertUnit copyArray copyFlexor copyKey copySkinWeights cos cpButton cpCache ' +
      'cpClothSet cpCollision cpConstraint cpConvClothToMesh cpForces cpGetSolverAttr cpPanel ' +
      'cpProperty cpRigidCollisionFilter cpSeam cpSetEdit cpSetSolverAttr cpSolver ' +
      'cpSolverTypes cpTool cpUpdateClothUVs createDisplayLayer createDrawCtx createEditor ' +
      'createLayeredPsdFile createMotionField createNewShelf createNode createRenderLayer ' +
      'createSubdivRegion cross crossProduct ctxAbort ctxCompletion ctxEditMode ctxTraverse ' +
      'currentCtx currentTime currentTimeCtx currentUnit curve curveAddPtCtx ' +
      'curveCVCtx curveEPCtx curveEditorCtx curveIntersect curveMoveEPCtx curveOnSurface ' +
      'curveSketchCtx cutKey cycleCheck cylinder dagPose date defaultLightListCheckBox ' +
      'defaultNavigation defineDataServer defineVirtualDevice deformer deg_to_rad delete ' +
      'deleteAttr deleteShadingGroupsAndMaterials deleteShelfTab deleteUI deleteUnusedBrushes ' +
      'delrandstr detachCurve detachDeviceAttr detachSurface deviceEditor devicePanel dgInfo ' +
      'dgdirty dgeval dgtimer dimWhen directKeyCtx directionalLight dirmap dirname disable ' +
      'disconnectAttr disconnectJoint diskCache displacementToPoly displayAffected ' +
      'displayColor displayCull displayLevelOfDetail displayPref displayRGBColor ' +
      'displaySmoothness displayStats displayString displaySurface distanceDimContext ' +
      'distanceDimension doBlur dolly dollyCtx dopeSheetEditor dot dotProduct ' +
      'doubleProfileBirailSurface drag dragAttrContext draggerContext dropoffLocator ' +
      'duplicate duplicateCurve duplicateSurface dynCache dynControl dynExport dynExpression ' +
      'dynGlobals dynPaintEditor dynParticleCtx dynPref dynRelEdPanel dynRelEditor ' +
      'dynamicLoad editAttrLimits editDisplayLayerGlobals editDisplayLayerMembers ' +
      'editRenderLayerAdjustment editRenderLayerGlobals editRenderLayerMembers editor ' +
      'editorTemplate effector emit emitter enableDevice encodeString endString endsWith env ' +
      'equivalent equivalentTol erf error eval evalDeferred evalEcho event ' +
      'exactWorldBoundingBox exclusiveLightCheckBox exec executeForEachObject exists exp ' +
      'expression expressionEditorListen extendCurve extendSurface extrude fcheck fclose feof ' +
      'fflush fgetline fgetword file fileBrowserDialog fileDialog fileExtension fileInfo ' +
      'filetest filletCurve filter filterCurve filterExpand filterStudioImport ' +
      'findAllIntersections findAnimCurves findKeyframe findMenuItem findRelatedSkinCluster ' +
      'finder firstParentOf fitBspline flexor floatEq floatField floatFieldGrp floatScrollBar ' +
      'floatSlider floatSlider2 floatSliderButtonGrp floatSliderGrp floor flow fluidCacheInfo ' +
      'fluidEmitter fluidVoxelInfo flushUndo fmod fontDialog fopen formLayout format fprint ' +
      'frameLayout fread freeFormFillet frewind fromNativePath fwrite gamma gauss ' +
      'geometryConstraint getApplicationVersionAsFloat getAttr getClassification ' +
      'getDefaultBrush getFileList getFluidAttr getInputDeviceRange getMayaPanelTypes ' +
      'getModifiers getPanel getParticleAttr getPluginResource getenv getpid glRender ' +
      'glRenderEditor globalStitch gmatch goal gotoBindPose grabColor gradientControl ' +
      'gradientControlNoAttr graphDollyCtx graphSelectContext graphTrackCtx gravity grid ' +
      'gridLayout group groupObjectsByName HfAddAttractorToAS HfAssignAS HfBuildEqualMap ' +
      'HfBuildFurFiles HfBuildFurImages HfCancelAFR HfConnectASToHF HfCreateAttractor ' +
      'HfDeleteAS HfEditAS HfPerformCreateAS HfRemoveAttractorFromAS HfSelectAttached ' +
      'HfSelectAttractors HfUnAssignAS hardenPointCurve hardware hardwareRenderPanel ' +
      'headsUpDisplay headsUpMessage help helpLine hermite hide hilite hitTest hotBox hotkey ' +
      'hotkeyCheck hsv_to_rgb hudButton hudSlider hudSliderButton hwReflectionMap hwRender ' +
      'hwRenderLoad hyperGraph hyperPanel hyperShade hypot iconTextButton iconTextCheckBox ' +
      'iconTextRadioButton iconTextRadioCollection iconTextScrollList iconTextStaticLabel ' +
      'ikHandle ikHandleCtx ikHandleDisplayScale ikSolver ikSplineHandleCtx ikSystem ' +
      'ikSystemInfo ikfkDisplayMethod illustratorCurves image imfPlugins inheritTransform ' +
      'insertJoint insertJointCtx insertKeyCtx insertKnotCurve insertKnotSurface instance ' +
      'instanceable instancer intField intFieldGrp intScrollBar intSlider intSliderGrp ' +
      'interToUI internalVar intersect iprEngine isAnimCurve isConnected isDirty isParentOf ' +
      'isSameObject isTrue isValidObjectName isValidString isValidUiName isolateSelect ' +
      'itemFilter itemFilterAttr itemFilterRender itemFilterType joint jointCluster jointCtx ' +
      'jointDisplayScale jointLattice keyTangent keyframe keyframeOutliner ' +
      'keyframeRegionCurrentTimeCtx keyframeRegionDirectKeyCtx keyframeRegionDollyCtx ' +
      'keyframeRegionInsertKeyCtx keyframeRegionMoveKeyCtx keyframeRegionScaleKeyCtx ' +
      'keyframeRegionSelectKeyCtx keyframeRegionSetKeyCtx keyframeRegionTrackCtx ' +
      'keyframeStats lassoContext lattice latticeDeformKeyCtx launch launchImageEditor ' +
      'layerButton layeredShaderPort layeredTexturePort layout layoutDialog lightList ' +
      'lightListEditor lightListPanel lightlink lineIntersection linearPrecision linstep ' +
      'listAnimatable listAttr listCameras listConnections listDeviceAttachments listHistory ' +
      'listInputDeviceAxes listInputDeviceButtons listInputDevices listMenuAnnotation ' +
      'listNodeTypes listPanelCategories listRelatives listSets listTransforms ' +
      'listUnselected listerEditor loadFluid loadNewShelf loadPlugin ' +
      'loadPluginLanguageResources loadPrefObjects localizedPanelLabel lockNode loft log ' +
      'longNameOf lookThru ls lsThroughFilter lsType lsUI Mayatomr mag makeIdentity makeLive ' +
      'makePaintable makeRoll makeSingleSurface makeTubeOn makebot manipMoveContext ' +
      'manipMoveLimitsCtx manipOptions manipRotateContext manipRotateLimitsCtx ' +
      'manipScaleContext manipScaleLimitsCtx marker match max memory menu menuBarLayout ' +
      'menuEditor menuItem menuItemToShelf menuSet menuSetPref messageLine min minimizeApp ' +
      'mirrorJoint modelCurrentTimeCtx modelEditor modelPanel mouse movIn movOut move ' +
      'moveIKtoFK moveKeyCtx moveVertexAlongDirection multiProfileBirailSurface mute ' +
      'nParticle nameCommand nameField namespace namespaceInfo newPanelItems newton nodeCast ' +
      'nodeIconButton nodeOutliner nodePreset nodeType noise nonLinear normalConstraint ' +
      'normalize nurbsBoolean nurbsCopyUVSet nurbsCube nurbsEditUV nurbsPlane nurbsSelect ' +
      'nurbsSquare nurbsToPoly nurbsToPolygonsPref nurbsToSubdiv nurbsToSubdivPref ' +
      'nurbsUVSet nurbsViewDirectionVector objExists objectCenter objectLayer objectType ' +
      'objectTypeUI obsoleteProc oceanNurbsPreviewPlane offsetCurve offsetCurveOnSurface ' +
      'offsetSurface openGLExtension openMayaPref optionMenu optionMenuGrp optionVar orbit ' +
      'orbitCtx orientConstraint outlinerEditor outlinerPanel overrideModifier ' +
      'paintEffectsDisplay pairBlend palettePort paneLayout panel panelConfiguration ' +
      'panelHistory paramDimContext paramDimension paramLocator parent parentConstraint ' +
      'particle particleExists particleInstancer particleRenderInfo partition pasteKey ' +
      'pathAnimation pause pclose percent performanceOptions pfxstrokes pickWalk picture ' +
      'pixelMove planarSrf plane play playbackOptions playblast plugAttr plugNode pluginInfo ' +
      'pluginResourceUtil pointConstraint pointCurveConstraint pointLight pointMatrixMult ' +
      'pointOnCurve pointOnSurface pointPosition poleVectorConstraint polyAppend ' +
      'polyAppendFacetCtx polyAppendVertex polyAutoProjection polyAverageNormal ' +
      'polyAverageVertex polyBevel polyBlendColor polyBlindData polyBoolOp polyBridgeEdge ' +
      'polyCacheMonitor polyCheck polyChipOff polyClipboard polyCloseBorder polyCollapseEdge ' +
      'polyCollapseFacet polyColorBlindData polyColorDel polyColorPerVertex polyColorSet ' +
      'polyCompare polyCone polyCopyUV polyCrease polyCreaseCtx polyCreateFacet ' +
      'polyCreateFacetCtx polyCube polyCut polyCutCtx polyCylinder polyCylindricalProjection ' +
      'polyDelEdge polyDelFacet polyDelVertex polyDuplicateAndConnect polyDuplicateEdge ' +
      'polyEditUV polyEditUVShell polyEvaluate polyExtrudeEdge polyExtrudeFacet ' +
      'polyExtrudeVertex polyFlipEdge polyFlipUV polyForceUV polyGeoSampler polyHelix ' +
      'polyInfo polyInstallAction polyLayoutUV polyListComponentConversion polyMapCut ' +
      'polyMapDel polyMapSew polyMapSewMove polyMergeEdge polyMergeEdgeCtx polyMergeFacet ' +
      'polyMergeFacetCtx polyMergeUV polyMergeVertex polyMirrorFace polyMoveEdge ' +
      'polyMoveFacet polyMoveFacetUV polyMoveUV polyMoveVertex polyNormal polyNormalPerVertex ' +
      'polyNormalizeUV polyOptUvs polyOptions polyOutput polyPipe polyPlanarProjection ' +
      'polyPlane polyPlatonicSolid polyPoke polyPrimitive polyPrism polyProjection ' +
      'polyPyramid polyQuad polyQueryBlindData polyReduce polySelect polySelectConstraint ' +
      'polySelectConstraintMonitor polySelectCtx polySelectEditCtx polySeparate ' +
      'polySetToFaceNormal polySewEdge polyShortestPathCtx polySmooth polySoftEdge ' +
      'polySphere polySphericalProjection polySplit polySplitCtx polySplitEdge polySplitRing ' +
      'polySplitVertex polyStraightenUVBorder polySubdivideEdge polySubdivideFacet ' +
      'polyToSubdiv polyTorus polyTransfer polyTriangulate polyUVSet polyUnite polyWedgeFace ' +
      'popen popupMenu pose pow preloadRefEd print progressBar progressWindow projFileViewer ' +
      'projectCurve projectTangent projectionContext projectionManip promptDialog propModCtx ' +
      'propMove psdChannelOutliner psdEditTextureFile psdExport psdTextureFile putenv pwd ' +
      'python querySubdiv quit rad_to_deg radial radioButton radioButtonGrp radioCollection ' +
      'radioMenuItemCollection rampColorPort rand randomizeFollicles randstate rangeControl ' +
      'readTake rebuildCurve rebuildSurface recordAttr recordDevice redo reference ' +
      'referenceEdit referenceQuery refineSubdivSelectionList refresh refreshAE ' +
      'registerPluginResource rehash reloadImage removeJoint removeMultiInstance ' +
      'removePanelCategory rename renameAttr renameSelectionList renameUI render ' +
      'renderGlobalsNode renderInfo renderLayerButton renderLayerParent ' +
      'renderLayerPostProcess renderLayerUnparent renderManip renderPartition ' +
      'renderQualityNode renderSettings renderThumbnailUpdate renderWindowEditor ' +
      'renderWindowSelectContext renderer reorder reorderDeformers requires reroot ' +
      'resampleFluid resetAE resetPfxToPolyCamera resetTool resolutionNode retarget ' +
      'reverseCurve reverseSurface revolve rgb_to_hsv rigidBody rigidSolver roll rollCtx ' +
      'rootOf rot rotate rotationInterpolation roundConstantRadius rowColumnLayout rowLayout ' +
      'runTimeCommand runup sampleImage saveAllShelves saveAttrPreset saveFluid saveImage ' +
      'saveInitialState saveMenu savePrefObjects savePrefs saveShelf saveToolSettings scale ' +
      'scaleBrushBrightness scaleComponents scaleConstraint scaleKey scaleKeyCtx sceneEditor ' +
      'sceneUIReplacement scmh scriptCtx scriptEditorInfo scriptJob scriptNode scriptTable ' +
      'scriptToShelf scriptedPanel scriptedPanelType scrollField scrollLayout sculpt ' +
      'searchPathArray seed selLoadSettings select selectContext selectCurveCV selectKey ' +
      'selectKeyCtx selectKeyframeRegionCtx selectMode selectPref selectPriority selectType ' +
      'selectedNodes selectionConnection separator setAttr setAttrEnumResource ' +
      'setAttrMapping setAttrNiceNameResource setConstraintRestPosition ' +
      'setDefaultShadingGroup setDrivenKeyframe setDynamic setEditCtx setEditor setFluidAttr ' +
      'setFocus setInfinity setInputDeviceMapping setKeyCtx setKeyPath setKeyframe ' +
      'setKeyframeBlendshapeTargetWts setMenuMode setNodeNiceNameResource setNodeTypeFlag ' +
      'setParent setParticleAttr setPfxToPolyCamera setPluginResource setProject ' +
      'setStampDensity setStartupMessage setState setToolTo setUITemplate setXformManip sets ' +
      'shadingConnection shadingGeometryRelCtx shadingLightRelCtx shadingNetworkCompare ' +
      'shadingNode shapeCompare shelfButton shelfLayout shelfTabLayout shellField ' +
      'shortNameOf showHelp showHidden showManipCtx showSelectionInTitle ' +
      'showShadingGroupAttrEditor showWindow sign simplify sin singleProfileBirailSurface ' +
      'size sizeBytes skinCluster skinPercent smoothCurve smoothTangentSurface smoothstep ' +
      'snap2to2 snapKey snapMode snapTogetherCtx snapshot soft softMod softModCtx sort sound ' +
      'soundControl source spaceLocator sphere sphrand spotLight spotLightPreviewPort ' +
      'spreadSheetEditor spring sqrt squareSurface srtContext stackTrace startString ' +
      'startsWith stitchAndExplodeShell stitchSurface stitchSurfacePoints strcmp ' +
      'stringArrayCatenate stringArrayContains stringArrayCount stringArrayInsertAtIndex ' +
      'stringArrayIntersector stringArrayRemove stringArrayRemoveAtIndex ' +
      'stringArrayRemoveDuplicates stringArrayRemoveExact stringArrayToString ' +
      'stringToStringArray strip stripPrefixFromName stroke subdAutoProjection ' +
      'subdCleanTopology subdCollapse subdDuplicateAndConnect subdEditUV ' +
      'subdListComponentConversion subdMapCut subdMapSewMove subdMatchTopology subdMirror ' +
      'subdToBlind subdToPoly subdTransferUVsToCache subdiv subdivCrease ' +
      'subdivDisplaySmoothness substitute substituteAllString substituteGeometry substring ' +
      'surface surfaceSampler surfaceShaderList swatchDisplayPort switchTable symbolButton ' +
      'symbolCheckBox sysFile system tabLayout tan tangentConstraint texLatticeDeformContext ' +
      'texManipContext texMoveContext texMoveUVShellContext texRotateContext texScaleContext ' +
      'texSelectContext texSelectShortestPathCtx texSmudgeUVContext texWinToolCtx text ' +
      'textCurves textField textFieldButtonGrp textFieldGrp textManip textScrollList ' +
      'textToShelf textureDisplacePlane textureHairColor texturePlacementContext ' +
      'textureWindow threadCount threePointArcCtx timeControl timePort timerX toNativePath ' +
      'toggle toggleAxis toggleWindowVisibility tokenize tokenizeList tolerance tolower ' +
      'toolButton toolCollection toolDropped toolHasOptions toolPropertyWindow torus toupper ' +
      'trace track trackCtx transferAttributes transformCompare transformLimits translator ' +
      'trim trunc truncateFluidCache truncateHairCache tumble tumbleCtx turbulence ' +
      'twoPointArcCtx uiRes uiTemplate unassignInputDevice undo undoInfo ungroup uniform unit ' +
      'unloadPlugin untangleUV untitledFileName untrim upAxis updateAE userCtx uvLink ' +
      'uvSnapshot validateShelfName vectorize view2dToolCtx viewCamera viewClipPlane ' +
      'viewFit viewHeadOn viewLookAt viewManip viewPlace viewSet visor volumeAxis vortex ' +
      'waitCursor warning webBrowser webBrowserPrefs whatIs window windowPref wire ' +
      'wireContext workspace wrinkle wrinkleContext writeTake xbmLangPathList xform',
    illegal: '</',
    contains: [
      hljs.C_NUMBER_MODE,
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE,
      {
        className: 'string',
        begin: '`', end: '`',
        contains: [hljs.BACKSLASH_ESCAPE]
      },
      {
        className: 'variable',
        variants: [
          {begin: '\\$\\d'},
          {begin: '[\\$\\%\\@](\\^\\w\\b|#\\w+|[^\\s\\w{]|{\\w+}|\\w+)'},
          {begin: '\\*(\\^\\w\\b|#\\w+|[^\\s\\w{]|{\\w+}|\\w+)', relevance: 0}
        ]
      },
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE
    ]
  };
};
},{}],83:[function(require,module,exports){
module.exports = function(hljs) {
  var KEYWORDS = {
    keyword:
      'module use_module import_module include_module end_module initialise ' +
      'mutable initialize finalize finalise interface implementation pred ' +
      'mode func type inst solver any_pred any_func is semidet det nondet ' +
      'multi erroneous failure cc_nondet cc_multi typeclass instance where ' +
      'pragma promise external trace atomic or_else require_complete_switch ' +
      'require_det require_semidet require_multi require_nondet ' +
      'require_cc_multi require_cc_nondet require_erroneous require_failure',
    pragma:
      'inline no_inline type_spec source_file fact_table obsolete memo ' +
      'loop_check minimal_model terminates does_not_terminate ' +
      'check_termination promise_equivalent_clauses',
    preprocessor:
      'foreign_proc foreign_decl foreign_code foreign_type ' +
      'foreign_import_module foreign_export_enum foreign_export ' +
      'foreign_enum may_call_mercury will_not_call_mercury thread_safe ' +
      'not_thread_safe maybe_thread_safe promise_pure promise_semipure ' +
      'tabled_for_io local untrailed trailed attach_to_io_state ' +
      'can_pass_as_mercury_type stable will_not_throw_exception ' +
      'may_modify_trail will_not_modify_trail may_duplicate ' +
      'may_not_duplicate affects_liveness does_not_affect_liveness ' +
      'doesnt_affect_liveness no_sharing unknown_sharing sharing',
    built_in:
      'some all not if then else true fail false try catch catch_any ' +
      'semidet_true semidet_false semidet_fail impure_true impure semipure'
  };

  var TODO = {
    className: 'label',
    begin: 'XXX', end: '$', endsWithParent: true,
    relevance: 0
  };
  var COMMENT = hljs.inherit(hljs.C_LINE_COMMENT_MODE, {begin: '%'});
  var CCOMMENT = hljs.inherit(hljs.C_BLOCK_COMMENT_MODE, {relevance: 0});
  COMMENT.contains.push(TODO);
  CCOMMENT.contains.push(TODO);

  var NUMCODE = {
    className: 'number',
    begin: "0'.\\|0[box][0-9a-fA-F]*"
  };

  var ATOM = hljs.inherit(hljs.APOS_STRING_MODE, {relevance: 0});
  var STRING = hljs.inherit(hljs.QUOTE_STRING_MODE, {relevance: 0});
  var STRING_FMT = {
    className: 'constant',
    begin: '\\\\[abfnrtv]\\|\\\\x[0-9a-fA-F]*\\\\\\|%[-+# *.0-9]*[dioxXucsfeEgGp]',
    relevance: 0
  };
  STRING.contains.push(STRING_FMT);

  var IMPLICATION = {
    className: 'built_in',
    variants: [
      {begin: '<=>'},
      {begin: '<=', relevance: 0},
      {begin: '=>', relevance: 0},
      {begin: '/\\\\'},
      {begin: '\\\\/'}
    ]
  };

  var HEAD_BODY_CONJUNCTION = {
    className: 'built_in',
    variants: [
      {begin: ':-\\|-->'},
      {begin: '=', relevance: 0}
    ]
  };

  return {
    aliases: ['m', 'moo'],
    keywords: KEYWORDS,
    contains: [
      IMPLICATION,
      HEAD_BODY_CONJUNCTION,
      COMMENT,
      CCOMMENT,
      NUMCODE,
      hljs.NUMBER_MODE,
      ATOM,
      STRING,
      {begin: /:-/} // relevance booster
    ]
  };
};
},{}],84:[function(require,module,exports){
module.exports = function(hljs) {
  return {
    keywords:
      'environ vocabularies notations constructors definitions ' +
      'registrations theorems schemes requirements begin end definition ' +
      'registration cluster existence pred func defpred deffunc theorem ' +
      'proof let take assume then thus hence ex for st holds consider ' +
      'reconsider such that and in provided of as from be being by means ' +
      'equals implies iff redefine define now not or attr is mode ' +
      'suppose per cases set thesis contradiction scheme reserve struct ' +
      'correctness compatibility coherence symmetry assymetry ' +
      'reflexivity irreflexivity connectedness uniqueness commutativity ' +
      'idempotence involutiveness projectivity',
    contains: [
      hljs.COMMENT('::', '$')
    ]
  };
};
},{}],85:[function(require,module,exports){
module.exports = function(hljs) {
  var NUMBER = {
    className: 'number', relevance: 0,
    variants: [
      {
        begin: '[$][a-fA-F0-9]+'
      },
      hljs.NUMBER_MODE
    ]
  };

  return {
    case_insensitive: true,
    keywords: {
      keyword: 'public private property continue exit extern new try catch ' +
        'eachin not abstract final select case default const local global field ' +
        'end if then else elseif endif while wend repeat until forever for to step next return module inline throw',

      built_in: 'DebugLog DebugStop Error Print ACos ACosr ASin ASinr ATan ATan2 ATan2r ATanr Abs Abs Ceil ' +
        'Clamp Clamp Cos Cosr Exp Floor Log Max Max Min Min Pow Sgn Sgn Sin Sinr Sqrt Tan Tanr Seed PI HALFPI TWOPI',

      literal: 'true false null and or shl shr mod'
    },
    contains: [
      hljs.COMMENT('#rem', '#end'),
      hljs.COMMENT(
        "'",
        '$',
        {
          relevance: 0
        }
      ),
      {
        className: 'function',
        beginKeywords: 'function method', end: '[(=:]|$',
        illegal: /\n/,
        contains: [
          hljs.UNDERSCORE_TITLE_MODE
        ]
      },
      {
        className: 'class',
        beginKeywords: 'class interface', end: '$',
        contains: [
          {
            beginKeywords: 'extends implements'
          },
          hljs.UNDERSCORE_TITLE_MODE
        ]
      },
      {
        className: 'variable',
        begin: '\\b(self|super)\\b'
      },
      {
        className: 'preprocessor',
        beginKeywords: 'import',
        end: '$'
      },
      {
        className: 'preprocessor',
        begin: '\\s*#', end: '$',
        keywords: 'if else elseif endif end then'
      },
      {
        className: 'pi',
        begin: '^\\s*strict\\b'
      },
      {
        beginKeywords: 'alias', end: '=',
        contains: [hljs.UNDERSCORE_TITLE_MODE]
      },
      hljs.QUOTE_STRING_MODE,
      NUMBER
    ]
  }
};
},{}],86:[function(require,module,exports){
module.exports = function(hljs) {
  var VAR = {
    className: 'variable',
    variants: [
      {begin: /\$\d+/},
      {begin: /\$\{/, end: /}/},
      {begin: '[\\$\\@]' + hljs.UNDERSCORE_IDENT_RE}
    ]
  };
  var DEFAULT = {
    endsWithParent: true,
    lexemes: '[a-z/_]+',
    keywords: {
      built_in:
        'on off yes no true false none blocked debug info notice warn error crit ' +
        'select break last permanent redirect kqueue rtsig epoll poll /dev/poll'
    },
    relevance: 0,
    illegal: '=>',
    contains: [
      hljs.HASH_COMMENT_MODE,
      {
        className: 'string',
        contains: [hljs.BACKSLASH_ESCAPE, VAR],
        variants: [
          {begin: /"/, end: /"/},
          {begin: /'/, end: /'/}
        ]
      },
      {
        className: 'url',
        begin: '([a-z]+):/', end: '\\s', endsWithParent: true, excludeEnd: true,
        contains: [VAR]
      },
      {
        className: 'regexp',
        contains: [hljs.BACKSLASH_ESCAPE, VAR],
        variants: [
          {begin: "\\s\\^", end: "\\s|{|;", returnEnd: true},
          // regexp locations (~, ~*)
          {begin: "~\\*?\\s+", end: "\\s|{|;", returnEnd: true},
          // *.example.com
          {begin: "\\*(\\.[a-z\\-]+)+"},
          // sub.example.*
          {begin: "([a-z\\-]+\\.)+\\*"}
        ]
      },
      // IP
      {
        className: 'number',
        begin: '\\b\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}(:\\d{1,5})?\\b'
      },
      // units
      {
        className: 'number',
        begin: '\\b\\d+[kKmMgGdshdwy]*\\b',
        relevance: 0
      },
      VAR
    ]
  };

  return {
    aliases: ['nginxconf'],
    contains: [
      hljs.HASH_COMMENT_MODE,
      {
        begin: hljs.UNDERSCORE_IDENT_RE + '\\s', end: ';|{', returnBegin: true,
        contains: [
          {
            className: 'title',
            begin: hljs.UNDERSCORE_IDENT_RE,
            starts: DEFAULT
          }
        ],
        relevance: 0
      }
    ],
    illegal: '[^\\s\\}]'
  };
};
},{}],87:[function(require,module,exports){
module.exports = function(hljs) {
  return {
    aliases: ['nim'],
    keywords: {
      keyword: 'addr and as asm bind block break|0 case|0 cast const|0 continue|0 converter discard distinct|10 div do elif else|0 end|0 enum|0 except export finally for from generic if|0 import|0 in include|0 interface is isnot|10 iterator|10 let|0 macro method|10 mixin mod nil not notin|10 object|0 of or out proc|10 ptr raise ref|10 return shl shr static template|10 try|0 tuple type|0 using|0 var|0 when while|0 with without xor yield',
      literal: 'shared guarded stdin stdout stderr result|10 true false'
    },
    contains: [ {
        className: 'decorator', // Actually pragma
        begin: /{\./,
        end: /\.}/,
        relevance: 10
      }, {
        className: 'string',
        begin: /[a-zA-Z]\w*"/,
        end: /"/,
        contains: [{begin: /""/}]
      }, {
        className: 'string',
        begin: /([a-zA-Z]\w*)?"""/,
        end: /"""/
      },
      hljs.QUOTE_STRING_MODE,
      {
        className: 'type',
        begin: /\b[A-Z]\w+\b/,
        relevance: 0
      }, {
        className: 'type',
        begin: /\b(int|int8|int16|int32|int64|uint|uint8|uint16|uint32|uint64|float|float32|float64|bool|char|string|cstring|pointer|expr|stmt|void|auto|any|range|array|openarray|varargs|seq|set|clong|culong|cchar|cschar|cshort|cint|csize|clonglong|cfloat|cdouble|clongdouble|cuchar|cushort|cuint|culonglong|cstringarray|semistatic)\b/
      }, {
        className: 'number',
        begin: /\b(0[xX][0-9a-fA-F][_0-9a-fA-F]*)('?[iIuU](8|16|32|64))?/,
        relevance: 0
      }, {
        className: 'number',
        begin: /\b(0o[0-7][_0-7]*)('?[iIuUfF](8|16|32|64))?/,
        relevance: 0
      }, {
        className: 'number',
        begin: /\b(0(b|B)[01][_01]*)('?[iIuUfF](8|16|32|64))?/,
        relevance: 0
      }, {
        className: 'number',
        begin: /\b(\d[_\d]*)('?[iIuUfF](8|16|32|64))?/,
        relevance: 0
      },
      hljs.HASH_COMMENT_MODE
    ]
  }
};
},{}],88:[function(require,module,exports){
module.exports = function(hljs) {
  var NIX_KEYWORDS = {
    keyword: 'rec with let in inherit assert if else then',
    constant: 'true false or and null',
    built_in:
      'import abort baseNameOf dirOf isNull builtins map removeAttrs throw toString derivation'
  };
  var ANTIQUOTE = {
    className: 'subst',
    begin: /\$\{/,
    end: /}/,
    keywords: NIX_KEYWORDS
  };
  var ATTRS = {
    className: 'variable',
    // TODO: we have to figure out a way how to exclude \s*=
    begin: /[a-zA-Z0-9-_]+(\s*=)/
  };
  var SINGLE_QUOTE = {
    className: 'string',
    begin: "''",
    end: "''",
    contains: [
      ANTIQUOTE
    ]
  };
  var DOUBLE_QUOTE = {
    className: 'string',
    begin: '"',
    end: '"',
    contains: [
      ANTIQUOTE
    ]
  };
  var EXPRESSIONS = [
    hljs.NUMBER_MODE,
    hljs.HASH_COMMENT_MODE,
    hljs.C_BLOCK_COMMENT_MODE,
    SINGLE_QUOTE,
    DOUBLE_QUOTE,
    ATTRS
  ];
  ANTIQUOTE.contains = EXPRESSIONS;
  return {
    aliases: ["nixos"],
    keywords: NIX_KEYWORDS,
    contains: EXPRESSIONS
  };
};
},{}],89:[function(require,module,exports){
module.exports = function(hljs) {
  var CONSTANTS = {
    className: 'symbol',
    begin: '\\$(ADMINTOOLS|APPDATA|CDBURN_AREA|CMDLINE|COMMONFILES32|COMMONFILES64|COMMONFILES|COOKIES|DESKTOP|DOCUMENTS|EXEDIR|EXEFILE|EXEPATH|FAVORITES|FONTS|HISTORY|HWNDPARENT|INSTDIR|INTERNET_CACHE|LANGUAGE|LOCALAPPDATA|MUSIC|NETHOOD|OUTDIR|PICTURES|PLUGINSDIR|PRINTHOOD|PROFILE|PROGRAMFILES32|PROGRAMFILES64|PROGRAMFILES|QUICKLAUNCH|RECENT|RESOURCES_LOCALIZED|RESOURCES|SENDTO|SMPROGRAMS|SMSTARTUP|STARTMENU|SYSDIR|TEMP|TEMPLATES|VIDEOS|WINDIR)'
  };

  var DEFINES = {
    // ${defines}
    className: 'constant',
    begin: '\\$+{[a-zA-Z0-9_]+}'
  };

  var VARIABLES = {
    // $variables
    className: 'variable',
    begin: '\\$+[a-zA-Z0-9_]+',
    illegal: '\\(\\){}'
  };

  var LANGUAGES = {
    // $(language_strings)
    className: 'constant',
    begin: '\\$+\\([a-zA-Z0-9_]+\\)'
  };

  var PARAMETERS = {
    // command parameters
    className: 'params',
    begin: '(ARCHIVE|FILE_ATTRIBUTE_ARCHIVE|FILE_ATTRIBUTE_NORMAL|FILE_ATTRIBUTE_OFFLINE|FILE_ATTRIBUTE_READONLY|FILE_ATTRIBUTE_SYSTEM|FILE_ATTRIBUTE_TEMPORARY|HKCR|HKCU|HKDD|HKEY_CLASSES_ROOT|HKEY_CURRENT_CONFIG|HKEY_CURRENT_USER|HKEY_DYN_DATA|HKEY_LOCAL_MACHINE|HKEY_PERFORMANCE_DATA|HKEY_USERS|HKLM|HKPD|HKU|IDABORT|IDCANCEL|IDIGNORE|IDNO|IDOK|IDRETRY|IDYES|MB_ABORTRETRYIGNORE|MB_DEFBUTTON1|MB_DEFBUTTON2|MB_DEFBUTTON3|MB_DEFBUTTON4|MB_ICONEXCLAMATION|MB_ICONINFORMATION|MB_ICONQUESTION|MB_ICONSTOP|MB_OK|MB_OKCANCEL|MB_RETRYCANCEL|MB_RIGHT|MB_RTLREADING|MB_SETFOREGROUND|MB_TOPMOST|MB_USERICON|MB_YESNO|NORMAL|OFFLINE|READONLY|SHCTX|SHELL_CONTEXT|SYSTEM|TEMPORARY)'
  };

  var COMPILER ={
    // !compiler_flags
    className: 'constant',
    begin: '\\!(addincludedir|addplugindir|appendfile|cd|define|delfile|echo|else|endif|error|execute|finalize|getdllversionsystem|ifdef|ifmacrodef|ifmacrondef|ifndef|if|include|insertmacro|macroend|macro|makensis|packhdr|searchparse|searchreplace|tempfile|undef|verbose|warning)'
  };

  return {
    case_insensitive: false,
    keywords: {
      keyword:
      'Abort AddBrandingImage AddSize AllowRootDirInstall AllowSkipFiles AutoCloseWindow BGFont BGGradient BrandingText BringToFront Call CallInstDLL Caption ChangeUI CheckBitmap ClearErrors CompletedText ComponentText CopyFiles CRCCheck CreateDirectory CreateFont CreateShortCut Delete DeleteINISec DeleteINIStr DeleteRegKey DeleteRegValue DetailPrint DetailsButtonText DirText DirVar DirVerify EnableWindow EnumRegKey EnumRegValue Exch Exec ExecShell ExecWait ExpandEnvStrings File FileBufSize FileClose FileErrorText FileOpen FileRead FileReadByte FileReadUTF16LE FileReadWord FileSeek FileWrite FileWriteByte FileWriteUTF16LE FileWriteWord FindClose FindFirst FindNext FindWindow FlushINI FunctionEnd GetCurInstType GetCurrentAddress GetDlgItem GetDLLVersion GetDLLVersionLocal GetErrorLevel GetFileTime GetFileTimeLocal GetFullPathName GetFunctionAddress GetInstDirError GetLabelAddress GetTempFileName Goto HideWindow Icon IfAbort IfErrors IfFileExists IfRebootFlag IfSilent InitPluginsDir InstallButtonText InstallColors InstallDir InstallDirRegKey InstProgressFlags InstType InstTypeGetText InstTypeSetText IntCmp IntCmpU IntFmt IntOp IsWindow LangString LicenseBkColor LicenseData LicenseForceSelection LicenseLangString LicenseText LoadLanguageFile LockWindow LogSet LogText ManifestDPIAware ManifestSupportedOS MessageBox MiscButtonText Name Nop OutFile Page PageCallbacks PageExEnd Pop Push Quit ReadEnvStr ReadINIStr ReadRegDWORD ReadRegStr Reboot RegDLL Rename RequestExecutionLevel ReserveFile Return RMDir SearchPath SectionEnd SectionGetFlags SectionGetInstTypes SectionGetSize SectionGetText SectionGroupEnd SectionIn SectionSetFlags SectionSetInstTypes SectionSetSize SectionSetText SendMessage SetAutoClose SetBrandingImage SetCompress SetCompressor SetCompressorDictSize SetCtlColors SetCurInstType SetDatablockOptimize SetDateSave SetDetailsPrint SetDetailsView SetErrorLevel SetErrors SetFileAttributes SetFont SetOutPath SetOverwrite SetPluginUnload SetRebootFlag SetRegView SetShellVarContext SetSilent ShowInstDetails ShowUninstDetails ShowWindow SilentInstall SilentUnInstall Sleep SpaceTexts StrCmp StrCmpS StrCpy StrLen SubCaption SubSectionEnd Unicode UninstallButtonText UninstallCaption UninstallIcon UninstallSubCaption UninstallText UninstPage UnRegDLL Var VIAddVersionKey VIFileVersion VIProductVersion WindowIcon WriteINIStr WriteRegBin WriteRegDWORD WriteRegExpandStr WriteRegStr WriteUninstaller XPStyle',
      literal:
      'admin all auto both colored current false force hide highest lastused leave listonly none normal notset off on open print show silent silentlog smooth textonly true user '
    },
    contains: [
      hljs.HASH_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      {
        className: 'string',
        begin: '"', end: '"',
        illegal: '\\n',
        contains: [
          { // $\n, $\r, $\t, $$
            className: 'symbol',
            begin: '\\$(\\\\(n|r|t)|\\$)'
          },
          CONSTANTS,
          DEFINES,
          VARIABLES,
          LANGUAGES
        ]
      },
      hljs.COMMENT(
        ';',
        '$',
        {
          relevance: 0
        }
      ),
      {
        className: 'function',
        beginKeywords: 'Function PageEx Section SectionGroup SubSection', end: '$'
      },
      COMPILER,
      DEFINES,
      VARIABLES,
      LANGUAGES,
      PARAMETERS,
      hljs.NUMBER_MODE,
      { // plug::ins
        className: 'literal',
        begin: hljs.IDENT_RE + '::' + hljs.IDENT_RE
      }
    ]
  };
};
},{}],90:[function(require,module,exports){
module.exports = function(hljs) {
  var API_CLASS = {
    className: 'built_in',
    begin: '(AV|CA|CF|CG|CI|MK|MP|NS|UI)\\w+',
  };
  var OBJC_KEYWORDS = {
    keyword:
      'int float while char export sizeof typedef const struct for union ' +
      'unsigned long volatile static bool mutable if do return goto void ' +
      'enum else break extern asm case short default double register explicit ' +
      'signed typename this switch continue wchar_t inline readonly assign ' +
      'readwrite self @synchronized id typeof ' +
      'nonatomic super unichar IBOutlet IBAction strong weak copy ' +
      'in out inout bycopy byref oneway __strong __weak __block __autoreleasing ' +
      '@private @protected @public @try @property @end @throw @catch @finally ' +
      '@autoreleasepool @synthesize @dynamic @selector @optional @required',
    literal:
      'false true FALSE TRUE nil YES NO NULL',
    built_in:
      'BOOL dispatch_once_t dispatch_queue_t dispatch_sync dispatch_async dispatch_once'
  };
  var LEXEMES = /[a-zA-Z@][a-zA-Z0-9_]*/;
  var CLASS_KEYWORDS = '@interface @class @protocol @implementation';
  return {
    aliases: ['mm', 'objc', 'obj-c'],
    keywords: OBJC_KEYWORDS,
    lexemes: LEXEMES,
    illegal: '</',
    contains: [
      API_CLASS,
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      hljs.C_NUMBER_MODE,
      hljs.QUOTE_STRING_MODE,
      {
        className: 'string',
        variants: [
          {
            begin: '@"', end: '"',
            illegal: '\\n',
            contains: [hljs.BACKSLASH_ESCAPE]
          },
          {
            begin: '\'', end: '[^\\\\]\'',
            illegal: '[^\\\\][^\']'
          }
        ]
      },
      {
        className: 'preprocessor',
        begin: '#',
        end: '$',
        contains: [
          {
            className: 'title',
            variants: [
              { begin: '\"', end: '\"' },
              { begin: '<', end: '>' }
            ]
          }
        ]
      },
      {
        className: 'class',
        begin: '(' + CLASS_KEYWORDS.split(' ').join('|') + ')\\b', end: '({|$)', excludeEnd: true,
        keywords: CLASS_KEYWORDS, lexemes: LEXEMES,
        contains: [
          hljs.UNDERSCORE_TITLE_MODE
        ]
      },
      {
        className: 'variable',
        begin: '\\.'+hljs.UNDERSCORE_IDENT_RE,
        relevance: 0
      }
    ]
  };
};
},{}],91:[function(require,module,exports){
module.exports = function(hljs) {
  /* missing support for heredoc-like string (OCaml 4.0.2+) */
  return {
    aliases: ['ml'],
    keywords: {
      keyword:
        'and as assert asr begin class constraint do done downto else end ' +
        'exception external for fun function functor if in include ' +
        'inherit! inherit initializer land lazy let lor lsl lsr lxor match method!|10 method ' +
        'mod module mutable new object of open! open or private rec sig struct ' +
        'then to try type val! val virtual when while with ' +
        /* camlp4 */
        'parser value',
      built_in:
        /* built-in types */
        'array bool bytes char exn|5 float int int32 int64 list lazy_t|5 nativeint|5 string unit ' +
        /* (some) types in Pervasives */
        'in_channel out_channel ref',
      literal:
        'true false'
    },
    illegal: /\/\/|>>/,
    lexemes: '[a-z_]\\w*!?',
    contains: [
      {
        className: 'literal',
        begin: '\\[(\\|\\|)?\\]|\\(\\)'
      },
      hljs.COMMENT(
        '\\(\\*',
        '\\*\\)',
        {
          contains: ['self']
        }
      ),
      { /* type variable */
        className: 'symbol',
        begin: '\'[A-Za-z_](?!\')[\\w\']*'
        /* the grammar is ambiguous on how 'a'b should be interpreted but not the compiler */
      },
      { /* polymorphic variant */
        className: 'tag',
        begin: '`[A-Z][\\w\']*'
      },
      { /* module or constructor */
        className: 'type',
        begin: '\\b[A-Z][\\w\']*',
        relevance: 0
      },
      { /* don't color identifiers, but safely catch all identifiers with '*/
        begin: '[a-z_]\\w*\'[\\w\']*'
      },
      hljs.inherit(hljs.APOS_STRING_MODE, {className: 'char', relevance: 0}),
      hljs.inherit(hljs.QUOTE_STRING_MODE, {illegal: null}),
      {
        className: 'number',
        begin:
          '\\b(0[xX][a-fA-F0-9_]+[Lln]?|' +
          '0[oO][0-7_]+[Lln]?|' +
          '0[bB][01_]+[Lln]?|' +
          '[0-9][0-9_]*([Lln]|(\\.[0-9_]*)?([eE][-+]?[0-9_]+)?)?)',
        relevance: 0
      },
      {
        begin: /[-=]>/ // relevance booster
      }
    ]
  }
};
},{}],92:[function(require,module,exports){
module.exports = function(hljs) {
	var SPECIAL_VARS = {
		className: 'keyword',
		begin: '\\$(f[asn]|t|vp[rtd]|children)'
	},
	LITERALS = {
		className: 'literal',
		begin: 'false|true|PI|undef'
	},
	NUMBERS = {
		className: 'number',
		begin: '\\b\\d+(\\.\\d+)?(e-?\\d+)?', //adds 1e5, 1e-10
		relevance: 0
	},
	STRING = hljs.inherit(hljs.QUOTE_STRING_MODE,{illegal: null}),
	PREPRO = {
		className: 'preprocessor',
		keywords: 'include use',
		begin: 'include|use <',
		end: '>'
	},
	PARAMS = {
		className: 'params',
		begin: '\\(', end: '\\)',
		contains: ['self', NUMBERS, STRING, SPECIAL_VARS, LITERALS]
	},
	MODIFIERS = {
		className: 'built_in',
		begin: '[*!#%]',
		relevance: 0
	},
	FUNCTIONS = {
		className: 'function',
		beginKeywords: 'module function',
		end: '\\=|\\{',
		contains: [PARAMS, hljs.UNDERSCORE_TITLE_MODE]
	};

	return {
		aliases: ['scad'],
		keywords: {
			keyword: 'function module include use for intersection_for if else \\%',
			literal: 'false true PI undef',
			built_in: 'circle square polygon text sphere cube cylinder polyhedron translate rotate scale resize mirror multmatrix color offset hull minkowski union difference intersection abs sign sin cos tan acos asin atan atan2 floor round ceil ln log pow sqrt exp rands min max concat lookup str chr search version version_num norm cross parent_module echo import import_dxf dxf_linear_extrude linear_extrude rotate_extrude surface projection render children dxf_cross dxf_dim let assign'
		},
		contains: [
			hljs.C_LINE_COMMENT_MODE,
			hljs.C_BLOCK_COMMENT_MODE,
			NUMBERS,
			PREPRO,
			STRING,
			PARAMS,
			SPECIAL_VARS,
			MODIFIERS,
			FUNCTIONS
		]
	}
};
},{}],93:[function(require,module,exports){
module.exports = function(hljs) {
  var OXYGENE_KEYWORDS = 'abstract add and array as asc aspect assembly async begin break block by case class concat const copy constructor continue '+
    'create default delegate desc distinct div do downto dynamic each else empty end ensure enum equals event except exit extension external false '+
    'final finalize finalizer finally flags for forward from function future global group has if implementation implements implies in index inherited '+
    'inline interface into invariants is iterator join locked locking loop matching method mod module namespace nested new nil not notify nullable of '+
    'old on operator or order out override parallel params partial pinned private procedure property protected public queryable raise read readonly '+
    'record reintroduce remove repeat require result reverse sealed select self sequence set shl shr skip static step soft take then to true try tuple '+
    'type union unit unsafe until uses using var virtual raises volatile where while with write xor yield await mapped deprecated stdcall cdecl pascal '+
    'register safecall overload library platform reference packed strict published autoreleasepool selector strong weak unretained';
  var CURLY_COMMENT =  hljs.COMMENT(
    '{',
    '}',
    {
      relevance: 0
    }
  );
  var PAREN_COMMENT = hljs.COMMENT(
    '\\(\\*',
    '\\*\\)',
    {
      relevance: 10
    }
  );
  var STRING = {
    className: 'string',
    begin: '\'', end: '\'',
    contains: [{begin: '\'\''}]
  };
  var CHAR_STRING = {
    className: 'string', begin: '(#\\d+)+'
  };
  var FUNCTION = {
    className: 'function',
    beginKeywords: 'function constructor destructor procedure method', end: '[:;]',
    keywords: 'function constructor|10 destructor|10 procedure|10 method|10',
    contains: [
      hljs.TITLE_MODE,
      {
        className: 'params',
        begin: '\\(', end: '\\)',
        keywords: OXYGENE_KEYWORDS,
        contains: [STRING, CHAR_STRING]
      },
      CURLY_COMMENT, PAREN_COMMENT
    ]
  };
  return {
    case_insensitive: true,
    keywords: OXYGENE_KEYWORDS,
    illegal: '("|\\$[G-Zg-z]|\\/\\*|</|=>|->)',
    contains: [
      CURLY_COMMENT, PAREN_COMMENT, hljs.C_LINE_COMMENT_MODE,
      STRING, CHAR_STRING,
      hljs.NUMBER_MODE,
      FUNCTION,
      {
        className: 'class',
        begin: '=\\bclass\\b', end: 'end;',
        keywords: OXYGENE_KEYWORDS,
        contains: [
          STRING, CHAR_STRING,
          CURLY_COMMENT, PAREN_COMMENT, hljs.C_LINE_COMMENT_MODE,
          FUNCTION
        ]
      }
    ]
  };
};
},{}],94:[function(require,module,exports){
module.exports = function(hljs) {
  var CURLY_SUBCOMMENT = hljs.COMMENT(
    '{',
    '}',
    {
      contains: ['self']
    }
  );
  return {
    subLanguage: 'xml', relevance: 0,
    contains: [
      hljs.COMMENT('^#', '$'),
      hljs.COMMENT(
        '\\^rem{',
        '}',
        {
          relevance: 10,
          contains: [
            CURLY_SUBCOMMENT
          ]
        }
      ),
      {
        className: 'preprocessor',
        begin: '^@(?:BASE|USE|CLASS|OPTIONS)$',
        relevance: 10
      },
      {
        className: 'title',
        begin: '@[\\w\\-]+\\[[\\w^;\\-]*\\](?:\\[[\\w^;\\-]*\\])?(?:.*)$'
      },
      {
        className: 'variable',
        begin: '\\$\\{?[\\w\\-\\.\\:]+\\}?'
      },
      {
        className: 'keyword',
        begin: '\\^[\\w\\-\\.\\:]+'
      },
      {
        className: 'number',
        begin: '\\^#[0-9a-fA-F]+'
      },
      hljs.C_NUMBER_MODE
    ]
  };
};
},{}],95:[function(require,module,exports){
module.exports = function(hljs) {
  var PERL_KEYWORDS = 'getpwent getservent quotemeta msgrcv scalar kill dbmclose undef lc ' +
    'ma syswrite tr send umask sysopen shmwrite vec qx utime local oct semctl localtime ' +
    'readpipe do return format read sprintf dbmopen pop getpgrp not getpwnam rewinddir qq' +
    'fileno qw endprotoent wait sethostent bless s|0 opendir continue each sleep endgrent ' +
    'shutdown dump chomp connect getsockname die socketpair close flock exists index shmget' +
    'sub for endpwent redo lstat msgctl setpgrp abs exit select print ref gethostbyaddr ' +
    'unshift fcntl syscall goto getnetbyaddr join gmtime symlink semget splice x|0 ' +
    'getpeername recv log setsockopt cos last reverse gethostbyname getgrnam study formline ' +
    'endhostent times chop length gethostent getnetent pack getprotoent getservbyname rand ' +
    'mkdir pos chmod y|0 substr endnetent printf next open msgsnd readdir use unlink ' +
    'getsockopt getpriority rindex wantarray hex system getservbyport endservent int chr ' +
    'untie rmdir prototype tell listen fork shmread ucfirst setprotoent else sysseek link ' +
    'getgrgid shmctl waitpid unpack getnetbyname reset chdir grep split require caller ' +
    'lcfirst until warn while values shift telldir getpwuid my getprotobynumber delete and ' +
    'sort uc defined srand accept package seekdir getprotobyname semop our rename seek if q|0 ' +
    'chroot sysread setpwent no crypt getc chown sqrt write setnetent setpriority foreach ' +
    'tie sin msgget map stat getlogin unless elsif truncate exec keys glob tied closedir' +
    'ioctl socket readlink eval xor readline binmode setservent eof ord bind alarm pipe ' +
    'atan2 getgrent exp time push setgrent gt lt or ne m|0 break given say state when';
  var SUBST = {
    className: 'subst',
    begin: '[$@]\\{', end: '\\}',
    keywords: PERL_KEYWORDS
  };
  var METHOD = {
    begin: '->{', end: '}'
    // contains defined later
  };
  var VAR = {
    className: 'variable',
    variants: [
      {begin: /\$\d/},
      {begin: /[\$%@](\^\w\b|#\w+(::\w+)*|{\w+}|\w+(::\w*)*)/},
      {begin: /[\$%@][^\s\w{]/, relevance: 0}
    ]
  };
  var COMMENT = hljs.COMMENT(
    '^(__END__|__DATA__)',
    '\\n$',
    {
      relevance: 5
    }
  );
  var STRING_CONTAINS = [hljs.BACKSLASH_ESCAPE, SUBST, VAR];
  var PERL_DEFAULT_CONTAINS = [
    VAR,
    hljs.HASH_COMMENT_MODE,
    COMMENT,
    hljs.COMMENT(
      '^\\=\\w',
      '\\=cut',
      {
        endsWithParent: true
      }
    ),
    METHOD,
    {
      className: 'string',
      contains: STRING_CONTAINS,
      variants: [
        {
          begin: 'q[qwxr]?\\s*\\(', end: '\\)',
          relevance: 5
        },
        {
          begin: 'q[qwxr]?\\s*\\[', end: '\\]',
          relevance: 5
        },
        {
          begin: 'q[qwxr]?\\s*\\{', end: '\\}',
          relevance: 5
        },
        {
          begin: 'q[qwxr]?\\s*\\|', end: '\\|',
          relevance: 5
        },
        {
          begin: 'q[qwxr]?\\s*\\<', end: '\\>',
          relevance: 5
        },
        {
          begin: 'qw\\s+q', end: 'q',
          relevance: 5
        },
        {
          begin: '\'', end: '\'',
          contains: [hljs.BACKSLASH_ESCAPE]
        },
        {
          begin: '"', end: '"'
        },
        {
          begin: '`', end: '`',
          contains: [hljs.BACKSLASH_ESCAPE]
        },
        {
          begin: '{\\w+}',
          contains: [],
          relevance: 0
        },
        {
          begin: '\-?\\w+\\s*\\=\\>',
          contains: [],
          relevance: 0
        }
      ]
    },
    {
      className: 'number',
      begin: '(\\b0[0-7_]+)|(\\b0x[0-9a-fA-F_]+)|(\\b[1-9][0-9_]*(\\.[0-9_]+)?)|[0_]\\b',
      relevance: 0
    },
    { // regexp container
      begin: '(\\/\\/|' + hljs.RE_STARTERS_RE + '|\\b(split|return|print|reverse|grep)\\b)\\s*',
      keywords: 'split return print reverse grep',
      relevance: 0,
      contains: [
        hljs.HASH_COMMENT_MODE,
        COMMENT,
        {
          className: 'regexp',
          begin: '(s|tr|y)/(\\\\.|[^/])*/(\\\\.|[^/])*/[a-z]*',
          relevance: 10
        },
        {
          className: 'regexp',
          begin: '(m|qr)?/', end: '/[a-z]*',
          contains: [hljs.BACKSLASH_ESCAPE],
          relevance: 0 // allows empty "//" which is a common comment delimiter in other languages
        }
      ]
    },
    {
      className: 'sub',
      beginKeywords: 'sub', end: '(\\s*\\(.*?\\))?[;{]',
      relevance: 5
    },
    {
      className: 'operator',
      begin: '-\\w\\b',
      relevance: 0
    }
  ];
  SUBST.contains = PERL_DEFAULT_CONTAINS;
  METHOD.contains = PERL_DEFAULT_CONTAINS;

  return {
    aliases: ['pl'],
    keywords: PERL_KEYWORDS,
    contains: PERL_DEFAULT_CONTAINS
  };
};
},{}],96:[function(require,module,exports){
module.exports = function(hljs) {
  var MACRO = {
    className: 'variable',
    begin: /\$[\w\d#@][\w\d_]*/
  };
  var TABLE = {
    className: 'variable',
    begin: /</, end: />/
  };
  var QUOTE_STRING = {
    className: 'string',
    begin: /"/, end: /"/
  };

  return {
    aliases: ['pf.conf'],
    lexemes: /[a-z0-9_<>-]+/,
    keywords: {
      built_in: /* block match pass are "actions" in pf.conf(5), the rest are
                 * lexically similar top-level commands.
                 */
        'block match pass load anchor|5 antispoof|10 set table',
      keyword:
        'in out log quick on rdomain inet inet6 proto from port os to route' +
        'allow-opts divert-packet divert-reply divert-to flags group icmp-type' +
        'icmp6-type label once probability recieved-on rtable prio queue' +
        'tos tag tagged user keep fragment for os drop' +
        'af-to|10 binat-to|10 nat-to|10 rdr-to|10 bitmask least-stats random round-robin' +
        'source-hash static-port' +
        'dup-to reply-to route-to' +
        'parent bandwidth default min max qlimit' +
        'block-policy debug fingerprints hostid limit loginterface optimization' +
        'reassemble ruleset-optimization basic none profile skip state-defaults' +
        'state-policy timeout' +
        'const counters persist' +
        'no modulate synproxy state|5 floating if-bound no-sync pflow|10 sloppy' +
        'source-track global rule max-src-nodes max-src-states max-src-conn' +
        'max-src-conn-rate overload flush' +
        'scrub|5 max-mss min-ttl no-df|10 random-id',
      literal:
        'all any no-route self urpf-failed egress|5 unknown',
    },
    contains: [
      hljs.HASH_COMMENT_MODE,
      hljs.NUMBER_MODE,
      hljs.QUOTE_STRING_MODE,
      MACRO,
      TABLE,
    ]
  };
};
},{}],97:[function(require,module,exports){
module.exports = function(hljs) {
  var VARIABLE = {
    className: 'variable', begin: '\\$+[a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*'
  };
  var PREPROCESSOR = {
    className: 'preprocessor', begin: /<\?(php)?|\?>/
  };
  var STRING = {
    className: 'string',
    contains: [hljs.BACKSLASH_ESCAPE, PREPROCESSOR],
    variants: [
      {
        begin: 'b"', end: '"'
      },
      {
        begin: 'b\'', end: '\''
      },
      hljs.inherit(hljs.APOS_STRING_MODE, {illegal: null}),
      hljs.inherit(hljs.QUOTE_STRING_MODE, {illegal: null})
    ]
  };
  var NUMBER = {variants: [hljs.BINARY_NUMBER_MODE, hljs.C_NUMBER_MODE]};
  return {
    aliases: ['php3', 'php4', 'php5', 'php6'],
    case_insensitive: true,
    keywords:
      'and include_once list abstract global private echo interface as static endswitch ' +
      'array null if endwhile or const for endforeach self var while isset public ' +
      'protected exit foreach throw elseif include __FILE__ empty require_once do xor ' +
      'return parent clone use __CLASS__ __LINE__ else break print eval new ' +
      'catch __METHOD__ case exception default die require __FUNCTION__ ' +
      'enddeclare final try switch continue endfor endif declare unset true false ' +
      'trait goto instanceof insteadof __DIR__ __NAMESPACE__ ' +
      'yield finally',
    contains: [
      hljs.C_LINE_COMMENT_MODE,
      hljs.HASH_COMMENT_MODE,
      hljs.COMMENT(
        '/\\*',
        '\\*/',
        {
          contains: [
            {
              className: 'doctag',
              begin: '@[A-Za-z]+'
            },
            PREPROCESSOR
          ]
        }
      ),
      hljs.COMMENT(
        '__halt_compiler.+?;',
        false,
        {
          endsWithParent: true,
          keywords: '__halt_compiler',
          lexemes: hljs.UNDERSCORE_IDENT_RE
        }
      ),
      {
        className: 'string',
        begin: '<<<[\'"]?\\w+[\'"]?$', end: '^\\w+;',
        contains: [hljs.BACKSLASH_ESCAPE]
      },
      PREPROCESSOR,
      VARIABLE,
      {
        // swallow composed identifiers to avoid parsing them as keywords
        begin: /(::|->)+[a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*/
      },
      {
        className: 'function',
        beginKeywords: 'function', end: /[;{]/, excludeEnd: true,
        illegal: '\\$|\\[|%',
        contains: [
          hljs.UNDERSCORE_TITLE_MODE,
          {
            className: 'params',
            begin: '\\(', end: '\\)',
            contains: [
              'self',
              VARIABLE,
              hljs.C_BLOCK_COMMENT_MODE,
              STRING,
              NUMBER
            ]
          }
        ]
      },
      {
        className: 'class',
        beginKeywords: 'class interface', end: '{', excludeEnd: true,
        illegal: /[:\(\$"]/,
        contains: [
          {beginKeywords: 'extends implements'},
          hljs.UNDERSCORE_TITLE_MODE
        ]
      },
      {
        beginKeywords: 'namespace', end: ';',
        illegal: /[\.']/,
        contains: [hljs.UNDERSCORE_TITLE_MODE]
      },
      {
        beginKeywords: 'use', end: ';',
        contains: [hljs.UNDERSCORE_TITLE_MODE]
      },
      {
        begin: '=>' // No markup, just a relevance booster
      },
      STRING,
      NUMBER
    ]
  };
};
},{}],98:[function(require,module,exports){
module.exports = function(hljs) {
  var backtickEscape = {
    begin: '`[\\s\\S]',
    relevance: 0
  };
  var dollarEscape = {
    begin: '\\$\\$[\\s\\S]',
    relevance: 0
  };
  var VAR = {
    className: 'variable',
    variants: [
      {begin: /\$[\w\d][\w\d_:]*/}
    ]
  };
  var QUOTE_STRING = {
    className: 'string',
    begin: /"/, end: /"/,
    contains: [
      backtickEscape,
      VAR,
      {
        className: 'variable',
        begin: /\$[A-z]/, end: /[^A-z]/
      }
    ]
  };
  var APOS_STRING = {
    className: 'string',
    begin: /'/, end: /'/
  };

  return {
    aliases: ['ps'],
    lexemes: /-?[A-z\.\-]+/,
    case_insensitive: true,
    keywords: {
      keyword: 'if else foreach return function do while until elseif begin for trap data dynamicparam end break throw param continue finally in switch exit filter try process catch',
      literal: '$null $true $false',
      built_in: 'Add-Content Add-History Add-Member Add-PSSnapin Clear-Content Clear-Item Clear-Item Property Clear-Variable Compare-Object ConvertFrom-SecureString Convert-Path ConvertTo-Html ConvertTo-SecureString Copy-Item Copy-ItemProperty Export-Alias Export-Clixml Export-Console Export-Csv ForEach-Object Format-Custom Format-List Format-Table Format-Wide Get-Acl Get-Alias Get-AuthenticodeSignature Get-ChildItem Get-Command Get-Content Get-Credential Get-Culture Get-Date Get-EventLog Get-ExecutionPolicy Get-Help Get-History Get-Host Get-Item Get-ItemProperty Get-Location Get-Member Get-PfxCertificate Get-Process Get-PSDrive Get-PSProvider Get-PSSnapin Get-Service Get-TraceSource Get-UICulture Get-Unique Get-Variable Get-WmiObject Group-Object Import-Alias Import-Clixml Import-Csv Invoke-Expression Invoke-History Invoke-Item Join-Path Measure-Command Measure-Object Move-Item Move-ItemProperty New-Alias New-Item New-ItemProperty New-Object New-PSDrive New-Service New-TimeSpan New-Variable Out-Default Out-File Out-Host Out-Null Out-Printer Out-String Pop-Location Push-Location Read-Host Remove-Item Remove-ItemProperty Remove-PSDrive Remove-PSSnapin Remove-Variable Rename-Item Rename-ItemProperty Resolve-Path Restart-Service Resume-Service Select-Object Select-String Set-Acl Set-Alias Set-AuthenticodeSignature Set-Content Set-Date Set-ExecutionPolicy Set-Item Set-ItemProperty Set-Location Set-PSDebug Set-Service Set-TraceSource Set-Variable Sort-Object Split-Path Start-Service Start-Sleep Start-Transcript Stop-Process Stop-Service Stop-Transcript Suspend-Service Tee-Object Test-Path Trace-Command Update-FormatData Update-TypeData Where-Object Write-Debug Write-Error Write-Host Write-Output Write-Progress Write-Verbose Write-Warning',
      operator: '-ne -eq -lt -gt -ge -le -not -like -notlike -match -notmatch -contains -notcontains -in -notin -replace'
    },
    contains: [
      hljs.HASH_COMMENT_MODE,
      hljs.NUMBER_MODE,
      QUOTE_STRING,
      APOS_STRING,
      VAR
    ]
  };
};
},{}],99:[function(require,module,exports){
module.exports = function(hljs) {
  return {
    keywords: {
      keyword: 'BufferedReader PVector PFont PImage PGraphics HashMap boolean byte char color ' +
        'double float int long String Array FloatDict FloatList IntDict IntList JSONArray JSONObject ' +
        'Object StringDict StringList Table TableRow XML ' +
        // Java keywords
        'false synchronized int abstract float private char boolean static null if const ' +
        'for true while long throw strictfp finally protected import native final return void ' +
        'enum else break transient new catch instanceof byte super volatile case assert short ' +
        'package default double public try this switch continue throws protected public private',
      constant: 'P2D P3D HALF_PI PI QUARTER_PI TAU TWO_PI',
      variable: 'displayHeight displayWidth mouseY mouseX mousePressed pmouseX pmouseY key ' +
        'keyCode pixels focused frameCount frameRate height width',
      title: 'setup draw',
      built_in: 'size createGraphics beginDraw createShape loadShape PShape arc ellipse line point ' +
        'quad rect triangle bezier bezierDetail bezierPoint bezierTangent curve curveDetail curvePoint ' +
        'curveTangent curveTightness shape shapeMode beginContour beginShape bezierVertex curveVertex ' +
        'endContour endShape quadraticVertex vertex ellipseMode noSmooth rectMode smooth strokeCap ' +
        'strokeJoin strokeWeight mouseClicked mouseDragged mouseMoved mousePressed mouseReleased ' +
        'mouseWheel keyPressed keyPressedkeyReleased keyTyped print println save saveFrame day hour ' +
        'millis minute month second year background clear colorMode fill noFill noStroke stroke alpha ' +
        'blue brightness color green hue lerpColor red saturation modelX modelY modelZ screenX screenY ' +
        'screenZ ambient emissive shininess specular add createImage beginCamera camera endCamera frustum ' +
        'ortho perspective printCamera printProjection cursor frameRate noCursor exit loop noLoop popStyle ' +
        'pushStyle redraw binary boolean byte char float hex int str unbinary unhex join match matchAll nf ' +
        'nfc nfp nfs split splitTokens trim append arrayCopy concat expand reverse shorten sort splice subset ' +
        'box sphere sphereDetail createInput createReader loadBytes loadJSONArray loadJSONObject loadStrings ' +
        'loadTable loadXML open parseXML saveTable selectFolder selectInput beginRaw beginRecord createOutput ' +
        'createWriter endRaw endRecord PrintWritersaveBytes saveJSONArray saveJSONObject saveStream saveStrings ' +
        'saveXML selectOutput popMatrix printMatrix pushMatrix resetMatrix rotate rotateX rotateY rotateZ scale ' +
        'shearX shearY translate ambientLight directionalLight lightFalloff lights lightSpecular noLights normal ' +
        'pointLight spotLight image imageMode loadImage noTint requestImage tint texture textureMode textureWrap ' +
        'blend copy filter get loadPixels set updatePixels blendMode loadShader PShaderresetShader shader createFont ' +
        'loadFont text textFont textAlign textLeading textMode textSize textWidth textAscent textDescent abs ceil ' +
        'constrain dist exp floor lerp log mag map max min norm pow round sq sqrt acos asin atan atan2 cos degrees ' +
        'radians sin tan noise noiseDetail noiseSeed random randomGaussian randomSeed'
    },
    contains: [
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE,
      hljs.C_NUMBER_MODE
    ]
  };
};
},{}],100:[function(require,module,exports){
module.exports = function(hljs) {
  return {
    contains: [
      hljs.C_NUMBER_MODE,
      {
        className: 'built_in',
        begin: '{', end: '}$',
        excludeBegin: true, excludeEnd: true,
        contains: [hljs.APOS_STRING_MODE, hljs.QUOTE_STRING_MODE],
        relevance: 0
      },
      {
        className: 'filename',
        begin: '[a-zA-Z_][\\da-zA-Z_]+\\.[\\da-zA-Z_]{1,3}', end: ':',
        excludeEnd: true
      },
      {
        className: 'header',
        begin: '(ncalls|tottime|cumtime)', end: '$',
        keywords: 'ncalls tottime|10 cumtime|10 filename',
        relevance: 10
      },
      {
        className: 'summary',
        begin: 'function calls', end: '$',
        contains: [hljs.C_NUMBER_MODE],
        relevance: 10
      },
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE,
      {
        className: 'function',
        begin: '\\(', end: '\\)$',
        contains: [
          hljs.UNDERSCORE_TITLE_MODE
        ],
        relevance: 0
      }
    ]
  };
};
},{}],101:[function(require,module,exports){
module.exports = function(hljs) {

  var ATOM = {

    className: 'atom',
    begin: /[a-z][A-Za-z0-9_]*/,
    relevance: 0
  };

  var VAR = {

    className: 'name',
    variants: [
      {begin: /[A-Z][a-zA-Z0-9_]*/},
      {begin: /_[A-Za-z0-9_]*/},
    ],
    relevance: 0
  };

  var PARENTED = {

    begin: /\(/,
    end: /\)/,
    relevance: 0
  };

  var LIST = {

    begin: /\[/,
    end: /\]/
  };

  var LINE_COMMENT = {

    className: 'comment',
    begin: /%/, end: /$/,
    contains: [hljs.PHRASAL_WORDS_MODE]
  };

  var BACKTICK_STRING = {

    className: 'string',
    begin: /`/, end: /`/,
    contains: [hljs.BACKSLASH_ESCAPE]
  };

  var CHAR_CODE = {

    className: 'string', // 0'a etc.
    begin: /0\'(\\\'|.)/
  };

  var SPACE_CODE = {

    className: 'string',
    begin: /0\'\\s/ // 0'\s
  };

  var PRED_OP = { // relevance booster
    begin: /:-/
  };

  var inner = [

    ATOM,
    VAR,
    PARENTED,
    PRED_OP,
    LIST,
    LINE_COMMENT,
    hljs.C_BLOCK_COMMENT_MODE,
    hljs.QUOTE_STRING_MODE,
    hljs.APOS_STRING_MODE,
    BACKTICK_STRING,
    CHAR_CODE,
    SPACE_CODE,
    hljs.C_NUMBER_MODE
  ];

  PARENTED.contains = inner;
  LIST.contains = inner;

  return {
    contains: inner.concat([
      {begin: /\.$/} // relevance booster
    ])
  };
};
},{}],102:[function(require,module,exports){
module.exports = function(hljs) {
  return {
    keywords: {
      keyword: 'package import option optional required repeated group',
      built_in: 'double float int32 int64 uint32 uint64 sint32 sint64 ' +
        'fixed32 fixed64 sfixed32 sfixed64 bool string bytes',
      literal: 'true false'
    },
    contains: [
      hljs.QUOTE_STRING_MODE,
      hljs.NUMBER_MODE,
      hljs.C_LINE_COMMENT_MODE,
      {
        className: 'class',
        beginKeywords: 'message enum service', end: /\{/,
        illegal: /\n/,
        contains: [
          hljs.inherit(hljs.TITLE_MODE, {
            starts: {endsWithParent: true, excludeEnd: true} // hack: eating everything after the first title
          })
        ]
      },
      {
        className: 'function',
        beginKeywords: 'rpc',
        end: /;/, excludeEnd: true,
        keywords: 'rpc returns'
      },
      {
        className: 'constant',
        begin: /^\s*[A-Z_]+/,
        end: /\s*=/, excludeEnd: true
      }
    ]
  };
};
},{}],103:[function(require,module,exports){
module.exports = function(hljs) {
  var PUPPET_TYPE_REFERENCE =
      'augeas computer cron exec file filebucket host interface k5login macauthorization mailalias maillist mcx mount nagios_command ' +
      'nagios_contact nagios_contactgroup nagios_host nagios_hostdependency nagios_hostescalation nagios_hostextinfo nagios_hostgroup nagios_service firewall ' +
      'nagios_servicedependency nagios_serviceescalation nagios_serviceextinfo nagios_servicegroup nagios_timeperiod notify package resources ' +
      'router schedule scheduled_task selboolean selmodule service ssh_authorized_key sshkey stage tidy user vlan yumrepo zfs zone zpool';

  var PUPPET_ATTRIBUTES =
    /* metaparameters */
      'alias audit before loglevel noop require subscribe tag ' +
    /* normal attributes */
      'owner ensure group mode name|0 changes context force incl lens load_path onlyif provider returns root show_diff type_check ' +
      'en_address ip_address realname command environment hour monute month monthday special target weekday '+
      'creates cwd ogoutput refresh refreshonly tries try_sleep umask backup checksum content ctime force ignore ' +
      'links mtime purge recurse recurselimit replace selinux_ignore_defaults selrange selrole seltype seluser source ' +
      'souirce_permissions sourceselect validate_cmd validate_replacement allowdupe attribute_membership auth_membership forcelocal gid '+
      'ia_load_module members system host_aliases ip allowed_trunk_vlans description device_url duplex encapsulation etherchannel ' +
      'native_vlan speed principals allow_root auth_class auth_type authenticate_user k_of_n mechanisms rule session_owner shared options ' +
      'device fstype enable hasrestart directory present absent link atboot blockdevice device dump pass remounts poller_tag use ' +
      'message withpath adminfile allow_virtual allowcdrom category configfiles flavor install_options instance package_settings platform ' +
      'responsefile status uninstall_options vendor unless_system_user unless_uid binary control flags hasstatus manifest pattern restart running ' +
      'start stop allowdupe auths expiry gid groups home iterations key_membership keys managehome membership password password_max_age ' +
      'password_min_age profile_membership profiles project purge_ssh_keys role_membership roles salt shell uid baseurl cost descr enabled ' +
      'enablegroups exclude failovermethod gpgcheck gpgkey http_caching include includepkgs keepalive metadata_expire metalink mirrorlist ' +
      'priority protect proxy proxy_password proxy_username repo_gpgcheck s3_enabled skip_if_unavailable sslcacert sslclientcert sslclientkey ' +
      'sslverify mounted';

  var PUPPET_KEYWORDS =
  {
  keyword:
    /* language keywords */
      'and case class default define else elsif false if in import enherits node or true undef unless main settings $string ' + PUPPET_TYPE_REFERENCE,
  literal:
      PUPPET_ATTRIBUTES,

  built_in:
    /* core facts */
      'architecture augeasversion blockdevices boardmanufacturer boardproductname boardserialnumber cfkey dhcp_servers ' +
      'domain ec2_ ec2_userdata facterversion filesystems ldom fqdn gid hardwareisa hardwaremodel hostname id|0 interfaces '+
      'ipaddress ipaddress_ ipaddress6 ipaddress6_ iphostnumber is_virtual kernel kernelmajversion kernelrelease kernelversion ' +
      'kernelrelease kernelversion lsbdistcodename lsbdistdescription lsbdistid lsbdistrelease lsbmajdistrelease lsbminordistrelease ' +
      'lsbrelease macaddress macaddress_ macosx_buildversion macosx_productname macosx_productversion macosx_productverson_major ' +
      'macosx_productversion_minor manufacturer memoryfree memorysize netmask metmask_ network_ operatingsystem operatingsystemmajrelease '+
      'operatingsystemrelease osfamily partitions path physicalprocessorcount processor processorcount productname ps puppetversion '+
      'rubysitedir rubyversion selinux selinux_config_mode selinux_config_policy selinux_current_mode selinux_current_mode selinux_enforced '+
      'selinux_policyversion serialnumber sp_ sshdsakey sshecdsakey sshrsakey swapencrypted swapfree swapsize timezone type uniqueid uptime '+
      'uptime_days uptime_hours uptime_seconds uuid virtual vlans xendomains zfs_version zonenae zones zpool_version'
  };

  var COMMENT = hljs.COMMENT('#', '$');

  var STRING = {
    className: 'string',
    contains: [hljs.BACKSLASH_ESCAPE],
    variants: [
      {begin: /'/, end: /'/},
      {begin: /"/, end: /"/}
    ]
  };

  var PUPPET_DEFAULT_CONTAINS = [
    STRING,
    COMMENT,
    {
      className: 'keyword',
      beginKeywords: 'class', end: '$|;',
      illegal: /=/,
      contains: [
        hljs.inherit(hljs.TITLE_MODE, {begin: '(::)?[A-Za-z_]\\w*(::\\w+)*'}),
        COMMENT,
        STRING
      ]
    },
    {
      className: 'keyword',
      begin: '([a-zA-Z_(::)]+ *\\{)',
      contains:[STRING, COMMENT],
      relevance: 0
    },
    {
      className: 'keyword',
      begin: '(\\}|\\{)',
      relevance: 0
    },
    {
      className: 'function',
      begin:'[a-zA-Z_]+\\s*=>'
    },
    {
      className: 'constant',
      begin: '(::)?(\\b[A-Z][a-z_]*(::)?)+',
      relevance: 0
    },
    {
      className: 'number',
      begin: '(\\b0[0-7_]+)|(\\b0x[0-9a-fA-F_]+)|(\\b[1-9][0-9_]*(\\.[0-9_]+)?)|[0_]\\b',
      relevance: 0
    }
  ];

  return {
    aliases: ['pp'],
    keywords: PUPPET_KEYWORDS,
    contains: PUPPET_DEFAULT_CONTAINS
  }
};
},{}],104:[function(require,module,exports){
module.exports = function(hljs) {
  var PROMPT = {
    className: 'prompt',  begin: /^(>>>|\.\.\.) /
  };
  var STRING = {
    className: 'string',
    contains: [hljs.BACKSLASH_ESCAPE],
    variants: [
      {
        begin: /(u|b)?r?'''/, end: /'''/,
        contains: [PROMPT],
        relevance: 10
      },
      {
        begin: /(u|b)?r?"""/, end: /"""/,
        contains: [PROMPT],
        relevance: 10
      },
      {
        begin: /(u|r|ur)'/, end: /'/,
        relevance: 10
      },
      {
        begin: /(u|r|ur)"/, end: /"/,
        relevance: 10
      },
      {
        begin: /(b|br)'/, end: /'/
      },
      {
        begin: /(b|br)"/, end: /"/
      },
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE
    ]
  };
  var NUMBER = {
    className: 'number', relevance: 0,
    variants: [
      {begin: hljs.BINARY_NUMBER_RE + '[lLjJ]?'},
      {begin: '\\b(0o[0-7]+)[lLjJ]?'},
      {begin: hljs.C_NUMBER_RE + '[lLjJ]?'}
    ]
  };
  var PARAMS = {
    className: 'params',
    begin: /\(/, end: /\)/,
    contains: ['self', PROMPT, NUMBER, STRING]
  };
  return {
    aliases: ['py', 'gyp'],
    keywords: {
      keyword:
        'and elif is global as in if from raise for except finally print import pass return ' +
        'exec else break not with class assert yield try while continue del or def lambda ' +
        'nonlocal|10 None True False',
      built_in:
        'Ellipsis NotImplemented'
    },
    illegal: /(<\/|->|\?)/,
    contains: [
      PROMPT,
      NUMBER,
      STRING,
      hljs.HASH_COMMENT_MODE,
      {
        variants: [
          {className: 'function', beginKeywords: 'def', relevance: 10},
          {className: 'class', beginKeywords: 'class'}
        ],
        end: /:/,
        illegal: /[${=;\n,]/,
        contains: [hljs.UNDERSCORE_TITLE_MODE, PARAMS]
      },
      {
        className: 'decorator',
        begin: /@/, end: /$/
      },
      {
        begin: /\b(print|exec)\(/ // don’t highlight keywords-turned-functions in Python 3
      }
    ]
  };
};
},{}],105:[function(require,module,exports){
module.exports = function(hljs) {
  var Q_KEYWORDS = {
  keyword:
    'do while select delete by update from',
  constant:
    '0b 1b',
  built_in:
    'neg not null string reciprocal floor ceiling signum mod xbar xlog and or each scan over prior mmu lsq inv md5 ltime gtime count first var dev med cov cor all any rand sums prds mins maxs fills deltas ratios avgs differ prev next rank reverse iasc idesc asc desc msum mcount mavg mdev xrank mmin mmax xprev rotate distinct group where flip type key til get value attr cut set upsert raze union inter except cross sv vs sublist enlist read0 read1 hopen hclose hdel hsym hcount peach system ltrim rtrim trim lower upper ssr view tables views cols xcols keys xkey xcol xasc xdesc fkeys meta lj aj aj0 ij pj asof uj ww wj wj1 fby xgroup ungroup ej save load rsave rload show csv parse eval min max avg wavg wsum sin cos tan sum',
  typename:
    '`float `double int `timestamp `timespan `datetime `time `boolean `symbol `char `byte `short `long `real `month `date `minute `second `guid'
  };
  return {
  aliases:['k', 'kdb'],
  keywords: Q_KEYWORDS,
  lexemes: /\b(`?)[A-Za-z0-9_]+\b/,
  contains: [
  hljs.C_LINE_COMMENT_MODE,
    hljs.QUOTE_STRING_MODE,
    hljs.C_NUMBER_MODE
     ]
  };
};
},{}],106:[function(require,module,exports){
module.exports = function(hljs) {
  var IDENT_RE = '([a-zA-Z]|\\.[a-zA-Z.])[a-zA-Z0-9._]*';

  return {
    contains: [
      hljs.HASH_COMMENT_MODE,
      {
        begin: IDENT_RE,
        lexemes: IDENT_RE,
        keywords: {
          keyword:
            'function if in break next repeat else for return switch while try tryCatch ' +
            'stop warning require library attach detach source setMethod setGeneric ' +
            'setGroupGeneric setClass ...',
          literal:
            'NULL NA TRUE FALSE T F Inf NaN NA_integer_|10 NA_real_|10 NA_character_|10 ' +
            'NA_complex_|10'
        },
        relevance: 0
      },
      {
        // hex value
        className: 'number',
        begin: "0[xX][0-9a-fA-F]+[Li]?\\b",
        relevance: 0
      },
      {
        // explicit integer
        className: 'number',
        begin: "\\d+(?:[eE][+\\-]?\\d*)?L\\b",
        relevance: 0
      },
      {
        // number with trailing decimal
        className: 'number',
        begin: "\\d+\\.(?!\\d)(?:i\\b)?",
        relevance: 0
      },
      {
        // number
        className: 'number',
        begin: "\\d+(?:\\.\\d*)?(?:[eE][+\\-]?\\d*)?i?\\b",
        relevance: 0
      },
      {
        // number with leading decimal
        className: 'number',
        begin: "\\.\\d+(?:[eE][+\\-]?\\d*)?i?\\b",
        relevance: 0
      },

      {
        // escaped identifier
        begin: '`',
        end: '`',
        relevance: 0
      },

      {
        className: 'string',
        contains: [hljs.BACKSLASH_ESCAPE],
        variants: [
          {begin: '"', end: '"'},
          {begin: "'", end: "'"}
        ]
      }
    ]
  };
};
},{}],107:[function(require,module,exports){
module.exports = function(hljs) {
  return {
    keywords:
      'ArchiveRecord AreaLightSource Atmosphere Attribute AttributeBegin AttributeEnd Basis ' +
      'Begin Blobby Bound Clipping ClippingPlane Color ColorSamples ConcatTransform Cone ' +
      'CoordinateSystem CoordSysTransform CropWindow Curves Cylinder DepthOfField Detail ' +
      'DetailRange Disk Displacement Display End ErrorHandler Exposure Exterior Format ' +
      'FrameAspectRatio FrameBegin FrameEnd GeneralPolygon GeometricApproximation Geometry ' +
      'Hider Hyperboloid Identity Illuminate Imager Interior LightSource ' +
      'MakeCubeFaceEnvironment MakeLatLongEnvironment MakeShadow MakeTexture Matte ' +
      'MotionBegin MotionEnd NuPatch ObjectBegin ObjectEnd ObjectInstance Opacity Option ' +
      'Orientation Paraboloid Patch PatchMesh Perspective PixelFilter PixelSamples ' +
      'PixelVariance Points PointsGeneralPolygons PointsPolygons Polygon Procedural Projection ' +
      'Quantize ReadArchive RelativeDetail ReverseOrientation Rotate Scale ScreenWindow ' +
      'ShadingInterpolation ShadingRate Shutter Sides Skew SolidBegin SolidEnd Sphere ' +
      'SubdivisionMesh Surface TextureCoordinates Torus Transform TransformBegin TransformEnd ' +
      'TransformPoints Translate TrimCurve WorldBegin WorldEnd',
    illegal: '</',
    contains: [
      hljs.HASH_COMMENT_MODE,
      hljs.C_NUMBER_MODE,
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE
    ]
  };
};
},{}],108:[function(require,module,exports){
module.exports = function(hljs) {
  var IDENTIFIER = '[a-zA-Z-_][^\n{\r\n]+\\{';

  return {
    aliases: ['graph', 'instances'],
    case_insensitive: true,
    keywords: 'import',
    contains: [
      // Facet sections
      {
        className: 'facet',
        begin: '^facet ' + IDENTIFIER,
        end: '}',
        keywords: 'facet installer exports children extends',
        contains: [
          hljs.HASH_COMMENT_MODE
        ]
      },

      // Instance sections
      {
        className: 'instance-of',
        begin: '^instance of ' + IDENTIFIER,
        end: '}',
        keywords: 'name count channels instance-data instance-state instance of',
        contains: [
          // Instance overridden properties
          {
            className: 'keyword',
            begin: '[a-zA-Z-_]+( |\t)*:'
          },
          hljs.HASH_COMMENT_MODE
        ]
      },

      // Component sections
      {
        className: 'component',
        begin: '^' + IDENTIFIER,
        end: '}',
        lexemes: '\\(?[a-zA-Z]+\\)?',
        keywords: 'installer exports children extends imports facets alias (optional)',
        contains: [
          // Imported component variables
          {
            className: 'string',
            begin: '\\.[a-zA-Z-_]+',
            end: '\\s|,|;',
            excludeEnd: true
          },
          hljs.HASH_COMMENT_MODE
        ]
      },

      // Comments
      hljs.HASH_COMMENT_MODE
    ]
  };
};
},{}],109:[function(require,module,exports){
module.exports = function(hljs) {
  return {
    keywords: {
      keyword:
        'float color point normal vector matrix while for if do return else break extern continue',
      built_in:
        'abs acos ambient area asin atan atmosphere attribute calculatenormal ceil cellnoise ' +
        'clamp comp concat cos degrees depth Deriv diffuse distance Du Dv environment exp ' +
        'faceforward filterstep floor format fresnel incident length lightsource log match ' +
        'max min mod noise normalize ntransform opposite option phong pnoise pow printf ' +
        'ptlined radians random reflect refract renderinfo round setcomp setxcomp setycomp ' +
        'setzcomp shadow sign sin smoothstep specular specularbrdf spline sqrt step tan ' +
        'texture textureinfo trace transform vtransform xcomp ycomp zcomp'
    },
    illegal: '</',
    contains: [
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      hljs.QUOTE_STRING_MODE,
      hljs.APOS_STRING_MODE,
      hljs.C_NUMBER_MODE,
      {
        className: 'preprocessor',
        begin: '#', end: '$'
      },
      {
        className: 'shader',
        beginKeywords: 'surface displacement light volume imager', end: '\\('
      },
      {
        className: 'shading',
        beginKeywords: 'illuminate illuminance gather', end: '\\('
      }
    ]
  };
};
},{}],110:[function(require,module,exports){
module.exports = function(hljs) {
  var RUBY_METHOD_RE = '[a-zA-Z_]\\w*[!?=]?|[-+~]\\@|<<|>>|=~|===?|<=>|[<>]=?|\\*\\*|[-/+%^&*~`|]|\\[\\]=?';
  var RUBY_KEYWORDS =
    'and false then defined module in return redo if BEGIN retry end for true self when ' +
    'next until do begin unless END rescue nil else break undef not super class case ' +
    'require yield alias while ensure elsif or include attr_reader attr_writer attr_accessor';
  var YARDOCTAG = {
    className: 'doctag',
    begin: '@[A-Za-z]+'
  };
  var IRB_OBJECT = {
    className: 'value',
    begin: '#<', end: '>'
  };
  var COMMENT_MODES = [
    hljs.COMMENT(
      '#',
      '$',
      {
        contains: [YARDOCTAG]
      }
    ),
    hljs.COMMENT(
      '^\\=begin',
      '^\\=end',
      {
        contains: [YARDOCTAG],
        relevance: 10
      }
    ),
    hljs.COMMENT('^__END__', '\\n$')
  ];
  var SUBST = {
    className: 'subst',
    begin: '#\\{', end: '}',
    keywords: RUBY_KEYWORDS
  };
  var STRING = {
    className: 'string',
    contains: [hljs.BACKSLASH_ESCAPE, SUBST],
    variants: [
      {begin: /'/, end: /'/},
      {begin: /"/, end: /"/},
      {begin: /`/, end: /`/},
      {begin: '%[qQwWx]?\\(', end: '\\)'},
      {begin: '%[qQwWx]?\\[', end: '\\]'},
      {begin: '%[qQwWx]?{', end: '}'},
      {begin: '%[qQwWx]?<', end: '>'},
      {begin: '%[qQwWx]?/', end: '/'},
      {begin: '%[qQwWx]?%', end: '%'},
      {begin: '%[qQwWx]?-', end: '-'},
      {begin: '%[qQwWx]?\\|', end: '\\|'},
      {
        // \B in the beginning suppresses recognition of ?-sequences where ?
        // is the last character of a preceding identifier, as in: `func?4`
        begin: /\B\?(\\\d{1,3}|\\x[A-Fa-f0-9]{1,2}|\\u[A-Fa-f0-9]{4}|\\?\S)\b/
      }
    ]
  };
  var PARAMS = {
    className: 'params',
    begin: '\\(', end: '\\)',
    keywords: RUBY_KEYWORDS
  };

  var RUBY_DEFAULT_CONTAINS = [
    STRING,
    IRB_OBJECT,
    {
      className: 'class',
      beginKeywords: 'class module', end: '$|;',
      illegal: /=/,
      contains: [
        hljs.inherit(hljs.TITLE_MODE, {begin: '[A-Za-z_]\\w*(::\\w+)*(\\?|\\!)?'}),
        {
          className: 'inheritance',
          begin: '<\\s*',
          contains: [{
            className: 'parent',
            begin: '(' + hljs.IDENT_RE + '::)?' + hljs.IDENT_RE
          }]
        }
      ].concat(COMMENT_MODES)
    },
    {
      className: 'function',
      beginKeywords: 'def', end: ' |$|;',
      relevance: 0,
      contains: [
        hljs.inherit(hljs.TITLE_MODE, {begin: RUBY_METHOD_RE}),
        PARAMS
      ].concat(COMMENT_MODES)
    },
    {
      className: 'constant',
      begin: '(::)?(\\b[A-Z]\\w*(::)?)+',
      relevance: 0
    },
    {
      className: 'symbol',
      begin: hljs.UNDERSCORE_IDENT_RE + '(\\!|\\?)?:',
      relevance: 0
    },
    {
      className: 'symbol',
      begin: ':',
      contains: [STRING, {begin: RUBY_METHOD_RE}],
      relevance: 0
    },
    {
      className: 'number',
      begin: '(\\b0[0-7_]+)|(\\b0x[0-9a-fA-F_]+)|(\\b[1-9][0-9_]*(\\.[0-9_]+)?)|[0_]\\b',
      relevance: 0
    },
    {
      className: 'variable',
      begin: '(\\$\\W)|((\\$|\\@\\@?)(\\w+))'
    },
    { // regexp container
      begin: '(' + hljs.RE_STARTERS_RE + ')\\s*',
      contains: [
        IRB_OBJECT,
        {
          className: 'regexp',
          contains: [hljs.BACKSLASH_ESCAPE, SUBST],
          illegal: /\n/,
          variants: [
            {begin: '/', end: '/[a-z]*'},
            {begin: '%r{', end: '}[a-z]*'},
            {begin: '%r\\(', end: '\\)[a-z]*'},
            {begin: '%r!', end: '![a-z]*'},
            {begin: '%r\\[', end: '\\][a-z]*'}
          ]
        }
      ].concat(COMMENT_MODES),
      relevance: 0
    }
  ].concat(COMMENT_MODES);

  SUBST.contains = RUBY_DEFAULT_CONTAINS;
  PARAMS.contains = RUBY_DEFAULT_CONTAINS;

  var SIMPLE_PROMPT = "[>?]>";
  var DEFAULT_PROMPT = "[\\w#]+\\(\\w+\\):\\d+:\\d+>";
  var RVM_PROMPT = "(\\w+-)?\\d+\\.\\d+\\.\\d(p\\d+)?[^>]+>";

  var IRB_DEFAULT = [
    {
      begin: /^\s*=>/,
      className: 'status',
      starts: {
        end: '$', contains: RUBY_DEFAULT_CONTAINS
      }
    },
    {
      className: 'prompt',
      begin: '^('+SIMPLE_PROMPT+"|"+DEFAULT_PROMPT+'|'+RVM_PROMPT+')',
      starts: {
        end: '$', contains: RUBY_DEFAULT_CONTAINS
      }
    }
  ];

  return {
    aliases: ['rb', 'gemspec', 'podspec', 'thor', 'irb'],
    keywords: RUBY_KEYWORDS,
    contains: COMMENT_MODES.concat(IRB_DEFAULT).concat(RUBY_DEFAULT_CONTAINS)
  };
};
},{}],111:[function(require,module,exports){
module.exports = function(hljs) {
  return {
    keywords: {
       keyword: 'BILL_PERIOD BILL_START BILL_STOP RS_EFFECTIVE_START RS_EFFECTIVE_STOP RS_JURIS_CODE RS_OPCO_CODE ' +
         'INTDADDATTRIBUTE|5 INTDADDVMSG|5 INTDBLOCKOP|5 INTDBLOCKOPNA|5 INTDCLOSE|5 INTDCOUNT|5 ' +
         'INTDCOUNTSTATUSCODE|5 INTDCREATEMASK|5 INTDCREATEDAYMASK|5 INTDCREATEFACTORMASK|5 ' +
         'INTDCREATEHANDLE|5 INTDCREATEOVERRIDEDAYMASK|5 INTDCREATEOVERRIDEMASK|5 ' +
         'INTDCREATESTATUSCODEMASK|5 INTDCREATETOUPERIOD|5 INTDDELETE|5 INTDDIPTEST|5 INTDEXPORT|5 ' +
         'INTDGETERRORCODE|5 INTDGETERRORMESSAGE|5 INTDISEQUAL|5 INTDJOIN|5 INTDLOAD|5 INTDLOADACTUALCUT|5 ' +
         'INTDLOADDATES|5 INTDLOADHIST|5 INTDLOADLIST|5 INTDLOADLISTDATES|5 INTDLOADLISTENERGY|5 ' +
         'INTDLOADLISTHIST|5 INTDLOADRELATEDCHANNEL|5 INTDLOADSP|5 INTDLOADSTAGING|5 INTDLOADUOM|5 ' +
         'INTDLOADUOMDATES|5 INTDLOADUOMHIST|5 INTDLOADVERSION|5 INTDOPEN|5 INTDREADFIRST|5 INTDREADNEXT|5 ' +
         'INTDRECCOUNT|5 INTDRELEASE|5 INTDREPLACE|5 INTDROLLAVG|5 INTDROLLPEAK|5 INTDSCALAROP|5 INTDSCALE|5 ' +
         'INTDSETATTRIBUTE|5 INTDSETDSTPARTICIPANT|5 INTDSETSTRING|5 INTDSETVALUE|5 INTDSETVALUESTATUS|5 ' +
         'INTDSHIFTSTARTTIME|5 INTDSMOOTH|5 INTDSORT|5 INTDSPIKETEST|5 INTDSUBSET|5 INTDTOU|5 ' +
         'INTDTOURELEASE|5 INTDTOUVALUE|5 INTDUPDATESTATS|5 INTDVALUE|5 STDEV INTDDELETEEX|5 ' +
         'INTDLOADEXACTUAL|5 INTDLOADEXCUT|5 INTDLOADEXDATES|5 INTDLOADEX|5 INTDLOADEXRELATEDCHANNEL|5 ' +
         'INTDSAVEEX|5 MVLOAD|5 MVLOADACCT|5 MVLOADACCTDATES|5 MVLOADACCTHIST|5 MVLOADDATES|5 MVLOADHIST|5 ' +
         'MVLOADLIST|5 MVLOADLISTDATES|5 MVLOADLISTHIST|5 IF FOR NEXT DONE SELECT END CALL ABORT CLEAR CHANNEL FACTOR LIST NUMBER ' +
         'OVERRIDE SET WEEK DISTRIBUTIONNODE ELSE WHEN THEN OTHERWISE IENUM CSV INCLUDE LEAVE RIDER SAVE DELETE ' +
         'NOVALUE SECTION WARN SAVE_UPDATE DETERMINANT LABEL REPORT REVENUE EACH ' +
         'IN FROM TOTAL CHARGE BLOCK AND OR CSV_FILE RATE_CODE AUXILIARY_DEMAND ' +
         'UIDACCOUNT RS BILL_PERIOD_SELECT HOURS_PER_MONTH INTD_ERROR_STOP SEASON_SCHEDULE_NAME ' +
         'ACCOUNTFACTOR ARRAYUPPERBOUND CALLSTOREDPROC GETADOCONNECTION GETCONNECT GETDATASOURCE ' +
         'GETQUALIFIER GETUSERID HASVALUE LISTCOUNT LISTOP LISTUPDATE LISTVALUE PRORATEFACTOR RSPRORATE ' +
         'SETBINPATH SETDBMONITOR WQ_OPEN BILLINGHOURS DATE DATEFROMFLOAT DATETIMEFROMSTRING ' +
         'DATETIMETOSTRING DATETOFLOAT DAY DAYDIFF DAYNAME DBDATETIME HOUR MINUTE MONTH MONTHDIFF ' +
         'MONTHHOURS MONTHNAME ROUNDDATE SAMEWEEKDAYLASTYEAR SECOND WEEKDAY WEEKDIFF YEAR YEARDAY ' +
         'YEARSTR COMPSUM HISTCOUNT HISTMAX HISTMIN HISTMINNZ HISTVALUE MAXNRANGE MAXRANGE MINRANGE ' +
         'COMPIKVA COMPKVA COMPKVARFROMKQKW COMPLF IDATTR FLAG LF2KW LF2KWH MAXKW POWERFACTOR ' +
         'READING2USAGE AVGSEASON MAXSEASON MONTHLYMERGE SEASONVALUE SUMSEASON ACCTREADDATES ' +
         'ACCTTABLELOAD CONFIGADD CONFIGGET CREATEOBJECT CREATEREPORT EMAILCLIENT EXPBLKMDMUSAGE ' +
         'EXPMDMUSAGE EXPORT_USAGE FACTORINEFFECT GETUSERSPECIFIEDSTOP INEFFECT ISHOLIDAY RUNRATE ' +
         'SAVE_PROFILE SETREPORTTITLE USEREXIT WATFORRUNRATE TO TABLE ACOS ASIN ATAN ATAN2 BITAND CEIL ' +
         'COS COSECANT COSH COTANGENT DIVQUOT DIVREM EXP FABS FLOOR FMOD FREPM FREXPN LOG LOG10 MAX MAXN ' +
         'MIN MINNZ MODF POW ROUND ROUND2VALUE ROUNDINT SECANT SIN SINH SQROOT TAN TANH FLOAT2STRING ' +
         'FLOAT2STRINGNC INSTR LEFT LEN LTRIM MID RIGHT RTRIM STRING STRINGNC TOLOWER TOUPPER TRIM ' +
         'NUMDAYS READ_DATE STAGING',
       built_in: 'IDENTIFIER OPTIONS XML_ELEMENT XML_OP XML_ELEMENT_OF DOMDOCCREATE DOMDOCLOADFILE DOMDOCLOADXML ' +
         'DOMDOCSAVEFILE DOMDOCGETROOT DOMDOCADDPI DOMNODEGETNAME DOMNODEGETTYPE DOMNODEGETVALUE DOMNODEGETCHILDCT ' +
         'DOMNODEGETFIRSTCHILD DOMNODEGETSIBLING DOMNODECREATECHILDELEMENT DOMNODESETATTRIBUTE ' +
         'DOMNODEGETCHILDELEMENTCT DOMNODEGETFIRSTCHILDELEMENT DOMNODEGETSIBLINGELEMENT DOMNODEGETATTRIBUTECT ' +
         'DOMNODEGETATTRIBUTEI DOMNODEGETATTRIBUTEBYNAME DOMNODEGETBYNAME'
    },
    contains: [
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE,
      hljs.C_NUMBER_MODE,
      { className: 'array',
        begin: '\#[a-zA-Z\ \.]+'
      }
    ]
  };
};
},{}],112:[function(require,module,exports){
module.exports = function(hljs) {
  var NUM_SUFFIX = '([uif](8|16|32|64|size))\?';
  var BLOCK_COMMENT = hljs.inherit(hljs.C_BLOCK_COMMENT_MODE);
  BLOCK_COMMENT.contains.push('self');
  return {
    aliases: ['rs'],
    keywords: {
      keyword:
        'alignof as be box break const continue crate do else enum extern ' +
        'false fn for if impl in let loop match mod mut offsetof once priv ' +
        'proc pub pure ref return self sizeof static struct super trait true ' +
        'type typeof unsafe unsized use virtual while yield ' +
        'int i8 i16 i32 i64 ' +
        'uint u8 u32 u64 ' +
        'float f32 f64 ' +
        'str char bool',
      built_in:
        'assert! assert_eq! bitflags! bytes! cfg! col! concat! concat_idents! ' +
        'debug_assert! debug_assert_eq! env! panic! file! format! format_args! ' +
        'include_bin! include_str! line! local_data_key! module_path! ' +
        'option_env! print! println! select! stringify! try! unimplemented! ' +
        'unreachable! vec! write! writeln!'
    },
    lexemes: hljs.IDENT_RE + '!?',
    illegal: '</',
    contains: [
      hljs.C_LINE_COMMENT_MODE,
      BLOCK_COMMENT,
      hljs.inherit(hljs.QUOTE_STRING_MODE, {illegal: null}),
      {
        className: 'string',
        variants: [
           { begin: /r(#*)".*?"\1(?!#)/ },
           { begin: /'\\?(x\w{2}|u\w{4}|U\w{8}|.)'/ },
           { begin: /'[a-zA-Z_][a-zA-Z0-9_]*/ }
        ]
      },
      {
        className: 'number',
        variants: [
          { begin: '\\b0b([01_]+)' + NUM_SUFFIX },
          { begin: '\\b0o([0-7_]+)' + NUM_SUFFIX },
          { begin: '\\b0x([A-Fa-f0-9_]+)' + NUM_SUFFIX },
          { begin: '\\b(\\d[\\d_]*(\\.[0-9_]+)?([eE][+-]?[0-9_]+)?)' +
                   NUM_SUFFIX
          }
        ],
        relevance: 0
      },
      {
        className: 'function',
        beginKeywords: 'fn', end: '(\\(|<)', excludeEnd: true,
        contains: [hljs.UNDERSCORE_TITLE_MODE]
      },
      {
        className: 'preprocessor',
        begin: '#\\!?\\[', end: '\\]'
      },
      {
        beginKeywords: 'type', end: '(=|<)',
        contains: [hljs.UNDERSCORE_TITLE_MODE],
        illegal: '\\S'
      },
      {
        beginKeywords: 'trait enum', end: '({|<)',
        contains: [hljs.UNDERSCORE_TITLE_MODE],
        illegal: '\\S'
      },
      {
        begin: hljs.IDENT_RE + '::'
      },
      {
        begin: '->'
      }
    ]
  };
};
},{}],113:[function(require,module,exports){
module.exports = function(hljs) {

  var ANNOTATION = {
    className: 'annotation', begin: '@[A-Za-z]+'
  };

  var STRING = {
    className: 'string',
    begin: 'u?r?"""', end: '"""',
    relevance: 10
  };

  var SYMBOL = {
    className: 'symbol',
    begin: '\'\\w[\\w\\d_]*(?!\')'
  };

  var TYPE = {
    className: 'type',
    begin: '\\b[A-Z][A-Za-z0-9_]*',
    relevance: 0
  };

  var NAME = {
    className: 'title',
    begin: /[^0-9\n\t "'(),.`{}\[\]:;][^\n\t "'(),.`{}\[\]:;]+|[^0-9\n\t "'(),.`{}\[\]:;=]/,
    relevance: 0
  };

  var CLASS = {
    className: 'class',
    beginKeywords: 'class object trait type',
    end: /[:={\[(\n;]/,
    contains: [{className: 'keyword', beginKeywords: 'extends with', relevance: 10}, NAME]
  };

  var METHOD = {
    className: 'function',
    beginKeywords: 'def val',
    end: /[:={\[(\n;]/,
    contains: [NAME]
  };

  return {
    keywords: {
      literal: 'true false null',
      keyword: 'type yield lazy override def with val var sealed abstract private trait object if forSome for while throw finally protected extends import final return else break new catch super class case package default try this match continue throws implicit'
    },
    contains: [
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      STRING,
      hljs.QUOTE_STRING_MODE,
      SYMBOL,
      TYPE,
      METHOD,
      CLASS,
      hljs.C_NUMBER_MODE,
      ANNOTATION
    ]
  };
};
},{}],114:[function(require,module,exports){
module.exports = function(hljs) {
  var SCHEME_IDENT_RE = '[^\\(\\)\\[\\]\\{\\}",\'`;#|\\\\\\s]+';
  var SCHEME_SIMPLE_NUMBER_RE = '(\\-|\\+)?\\d+([./]\\d+)?';
  var SCHEME_COMPLEX_NUMBER_RE = SCHEME_SIMPLE_NUMBER_RE + '[+\\-]' + SCHEME_SIMPLE_NUMBER_RE + 'i';
  var BUILTINS = {
    built_in:
      'case-lambda call/cc class define-class exit-handler field import ' +
      'inherit init-field interface let*-values let-values let/ec mixin ' +
      'opt-lambda override protect provide public rename require ' +
      'require-for-syntax syntax syntax-case syntax-error unit/sig unless ' +
      'when with-syntax and begin call-with-current-continuation ' +
      'call-with-input-file call-with-output-file case cond define ' +
      'define-syntax delay do dynamic-wind else for-each if lambda let let* ' +
      'let-syntax letrec letrec-syntax map or syntax-rules \' * + , ,@ - ... / ' +
      '; < <= = => > >= ` abs acos angle append apply asin assoc assq assv atan ' +
      'boolean? caar cadr call-with-input-file call-with-output-file ' +
      'call-with-values car cdddar cddddr cdr ceiling char->integer ' +
      'char-alphabetic? char-ci<=? char-ci<? char-ci=? char-ci>=? char-ci>? ' +
      'char-downcase char-lower-case? char-numeric? char-ready? char-upcase ' +
      'char-upper-case? char-whitespace? char<=? char<? char=? char>=? char>? ' +
      'char? close-input-port close-output-port complex? cons cos ' +
      'current-input-port current-output-port denominator display eof-object? ' +
      'eq? equal? eqv? eval even? exact->inexact exact? exp expt floor ' +
      'force gcd imag-part inexact->exact inexact? input-port? integer->char ' +
      'integer? interaction-environment lcm length list list->string ' +
      'list->vector list-ref list-tail list? load log magnitude make-polar ' +
      'make-rectangular make-string make-vector max member memq memv min ' +
      'modulo negative? newline not null-environment null? number->string ' +
      'number? numerator odd? open-input-file open-output-file output-port? ' +
      'pair? peek-char port? positive? procedure? quasiquote quote quotient ' +
      'rational? rationalize read read-char real-part real? remainder reverse ' +
      'round scheme-report-environment set! set-car! set-cdr! sin sqrt string ' +
      'string->list string->number string->symbol string-append string-ci<=? ' +
      'string-ci<? string-ci=? string-ci>=? string-ci>? string-copy ' +
      'string-fill! string-length string-ref string-set! string<=? string<? ' +
      'string=? string>=? string>? string? substring symbol->string symbol? ' +
      'tan transcript-off transcript-on truncate values vector ' +
      'vector->list vector-fill! vector-length vector-ref vector-set! ' +
      'with-input-from-file with-output-to-file write write-char zero?'
  };

  var SHEBANG = {
    className: 'shebang',
    begin: '^#!',
    end: '$'
  };

  var LITERAL = {
    className: 'literal',
    begin: '(#t|#f|#\\\\' + SCHEME_IDENT_RE + '|#\\\\.)'
  };

  var NUMBER = {
    className: 'number',
    variants: [
      { begin: SCHEME_SIMPLE_NUMBER_RE, relevance: 0 },
      { begin: SCHEME_COMPLEX_NUMBER_RE, relevance: 0 },
      { begin: '#b[0-1]+(/[0-1]+)?' },
      { begin: '#o[0-7]+(/[0-7]+)?' },
      { begin: '#x[0-9a-f]+(/[0-9a-f]+)?' }
    ]
  };

  var STRING = hljs.QUOTE_STRING_MODE;

  var REGULAR_EXPRESSION = {
    className: 'regexp',
    begin: '#[pr]x"',
    end: '[^\\\\]"'
  };

  var COMMENT_MODES = [
    hljs.COMMENT(
      ';',
      '$',
      {
        relevance: 0
      }
    ),
    hljs.COMMENT('#\\|', '\\|#')
  ];

  var IDENT = {
    begin: SCHEME_IDENT_RE,
    relevance: 0
  };

  var QUOTED_IDENT = {
    className: 'variable',
    begin: '\'' + SCHEME_IDENT_RE
  };

  var BODY = {
    endsWithParent: true,
    relevance: 0
  };

  var LIST = {
    className: 'list',
    variants: [
      { begin: '\\(', end: '\\)' },
      { begin: '\\[', end: '\\]' }
    ],
    contains: [
      {
        className: 'keyword',
        begin: SCHEME_IDENT_RE,
        lexemes: SCHEME_IDENT_RE,
        keywords: BUILTINS
      },
      BODY
    ]
  };

  BODY.contains = [LITERAL, NUMBER, STRING, IDENT, QUOTED_IDENT, LIST].concat(COMMENT_MODES);

  return {
    illegal: /\S/,
    contains: [SHEBANG, NUMBER, STRING, QUOTED_IDENT, LIST].concat(COMMENT_MODES)
  };
};
},{}],115:[function(require,module,exports){
module.exports = function(hljs) {

  var COMMON_CONTAINS = [
    hljs.C_NUMBER_MODE,
    {
      className: 'string',
      begin: '\'|\"', end: '\'|\"',
      contains: [hljs.BACKSLASH_ESCAPE, {begin: '\'\''}]
    }
  ];

  return {
    aliases: ['sci'],
    keywords: {
      keyword: 'abort break case clear catch continue do elseif else endfunction end for function'+
        'global if pause return resume select try then while'+
        '%f %F %t %T %pi %eps %inf %nan %e %i %z %s',
      built_in: // Scilab has more than 2000 functions. Just list the most commons
       'abs and acos asin atan ceil cd chdir clearglobal cosh cos cumprod deff disp error'+
       'exec execstr exists exp eye gettext floor fprintf fread fsolve imag isdef isempty'+
       'isinfisnan isvector lasterror length load linspace list listfiles log10 log2 log'+
       'max min msprintf mclose mopen ones or pathconvert poly printf prod pwd rand real'+
       'round sinh sin size gsort sprintf sqrt strcat strcmps tring sum system tanh tan'+
       'type typename warning zeros matrix'
    },
    illegal: '("|#|/\\*|\\s+/\\w+)',
    contains: [
      {
        className: 'function',
        beginKeywords: 'function endfunction', end: '$',
        keywords: 'function endfunction|10',
        contains: [
          hljs.UNDERSCORE_TITLE_MODE,
          {
            className: 'params',
            begin: '\\(', end: '\\)'
          }
        ]
      },
      {
        className: 'transposed_variable',
        begin: '[a-zA-Z_][a-zA-Z_0-9]*(\'+[\\.\']*|[\\.\']+)', end: '',
        relevance: 0
      },
      {
        className: 'matrix',
        begin: '\\[', end: '\\]\'*[\\.\']*',
        relevance: 0,
        contains: COMMON_CONTAINS
      },
      hljs.COMMENT('//', '$')
    ].concat(COMMON_CONTAINS)
  };
};
},{}],116:[function(require,module,exports){
module.exports = function(hljs) {
  var IDENT_RE = '[a-zA-Z-][a-zA-Z0-9_-]*';
  var VARIABLE = {
    className: 'variable',
    begin: '(\\$' + IDENT_RE + ')\\b'
  };
  var FUNCTION = {
    className: 'function',
    begin: IDENT_RE + '\\(',
    returnBegin: true,
    excludeEnd: true,
    end: '\\('
  };
  var HEXCOLOR = {
    className: 'hexcolor', begin: '#[0-9A-Fa-f]+'
  };
  var DEF_INTERNALS = {
    className: 'attribute',
    begin: '[A-Z\\_\\.\\-]+', end: ':',
    excludeEnd: true,
    illegal: '[^\\s]',
    starts: {
      className: 'value',
      endsWithParent: true, excludeEnd: true,
      contains: [
        FUNCTION,
        HEXCOLOR,
        hljs.CSS_NUMBER_MODE,
        hljs.QUOTE_STRING_MODE,
        hljs.APOS_STRING_MODE,
        hljs.C_BLOCK_COMMENT_MODE,
        {
          className: 'important', begin: '!important'
        }
      ]
    }
  };
  return {
    case_insensitive: true,
    illegal: '[=/|\']',
    contains: [
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      FUNCTION,
      {
        className: 'id', begin: '\\#[A-Za-z0-9_-]+',
        relevance: 0
      },
      {
        className: 'class', begin: '\\.[A-Za-z0-9_-]+',
        relevance: 0
      },
      {
        className: 'attr_selector',
        begin: '\\[', end: '\\]',
        illegal: '$'
      },
      {
        className: 'tag', // begin: IDENT_RE, end: '[,|\\s]'
        begin: '\\b(a|abbr|acronym|address|area|article|aside|audio|b|base|big|blockquote|body|br|button|canvas|caption|cite|code|col|colgroup|command|datalist|dd|del|details|dfn|div|dl|dt|em|embed|fieldset|figcaption|figure|footer|form|frame|frameset|(h[1-6])|head|header|hgroup|hr|html|i|iframe|img|input|ins|kbd|keygen|label|legend|li|link|map|mark|meta|meter|nav|noframes|noscript|object|ol|optgroup|option|output|p|param|pre|progress|q|rp|rt|ruby|samp|script|section|select|small|span|strike|strong|style|sub|sup|table|tbody|td|textarea|tfoot|th|thead|time|title|tr|tt|ul|var|video)\\b',
        relevance: 0
      },
      {
        className: 'pseudo',
        begin: ':(visited|valid|root|right|required|read-write|read-only|out-range|optional|only-of-type|only-child|nth-of-type|nth-last-of-type|nth-last-child|nth-child|not|link|left|last-of-type|last-child|lang|invalid|indeterminate|in-range|hover|focus|first-of-type|first-line|first-letter|first-child|first|enabled|empty|disabled|default|checked|before|after|active)'
      },
      {
        className: 'pseudo',
        begin: '::(after|before|choices|first-letter|first-line|repeat-index|repeat-item|selection|value)'
      },
      VARIABLE,
      {
        className: 'attribute',
        begin: '\\b(z-index|word-wrap|word-spacing|word-break|width|widows|white-space|visibility|vertical-align|unicode-bidi|transition-timing-function|transition-property|transition-duration|transition-delay|transition|transform-style|transform-origin|transform|top|text-underline-position|text-transform|text-shadow|text-rendering|text-overflow|text-indent|text-decoration-style|text-decoration-line|text-decoration-color|text-decoration|text-align-last|text-align|tab-size|table-layout|right|resize|quotes|position|pointer-events|perspective-origin|perspective|page-break-inside|page-break-before|page-break-after|padding-top|padding-right|padding-left|padding-bottom|padding|overflow-y|overflow-x|overflow-wrap|overflow|outline-width|outline-style|outline-offset|outline-color|outline|orphans|order|opacity|object-position|object-fit|normal|none|nav-up|nav-right|nav-left|nav-index|nav-down|min-width|min-height|max-width|max-height|mask|marks|margin-top|margin-right|margin-left|margin-bottom|margin|list-style-type|list-style-position|list-style-image|list-style|line-height|letter-spacing|left|justify-content|initial|inherit|ime-mode|image-orientation|image-resolution|image-rendering|icon|hyphens|height|font-weight|font-variant-ligatures|font-variant|font-style|font-stretch|font-size-adjust|font-size|font-language-override|font-kerning|font-feature-settings|font-family|font|float|flex-wrap|flex-shrink|flex-grow|flex-flow|flex-direction|flex-basis|flex|filter|empty-cells|display|direction|cursor|counter-reset|counter-increment|content|column-width|column-span|column-rule-width|column-rule-style|column-rule-color|column-rule|column-gap|column-fill|column-count|columns|color|clip-path|clip|clear|caption-side|break-inside|break-before|break-after|box-sizing|box-shadow|box-decoration-break|bottom|border-width|border-top-width|border-top-style|border-top-right-radius|border-top-left-radius|border-top-color|border-top|border-style|border-spacing|border-right-width|border-right-style|border-right-color|border-right|border-radius|border-left-width|border-left-style|border-left-color|border-left|border-image-width|border-image-source|border-image-slice|border-image-repeat|border-image-outset|border-image|border-color|border-collapse|border-bottom-width|border-bottom-style|border-bottom-right-radius|border-bottom-left-radius|border-bottom-color|border-bottom|border|background-size|background-repeat|background-position|background-origin|background-image|background-color|background-clip|background-attachment|background-blend-mode|background|backface-visibility|auto|animation-timing-function|animation-play-state|animation-name|animation-iteration-count|animation-fill-mode|animation-duration|animation-direction|animation-delay|animation|align-self|align-items|align-content)\\b',
        illegal: '[^\\s]'
      },
      {
        className: 'value',
        begin: '\\b(whitespace|wait|w-resize|visible|vertical-text|vertical-ideographic|uppercase|upper-roman|upper-alpha|underline|transparent|top|thin|thick|text|text-top|text-bottom|tb-rl|table-header-group|table-footer-group|sw-resize|super|strict|static|square|solid|small-caps|separate|se-resize|scroll|s-resize|rtl|row-resize|ridge|right|repeat|repeat-y|repeat-x|relative|progress|pointer|overline|outside|outset|oblique|nowrap|not-allowed|normal|none|nw-resize|no-repeat|no-drop|newspaper|ne-resize|n-resize|move|middle|medium|ltr|lr-tb|lowercase|lower-roman|lower-alpha|loose|list-item|line|line-through|line-edge|lighter|left|keep-all|justify|italic|inter-word|inter-ideograph|inside|inset|inline|inline-block|inherit|inactive|ideograph-space|ideograph-parenthesis|ideograph-numeric|ideograph-alpha|horizontal|hidden|help|hand|groove|fixed|ellipsis|e-resize|double|dotted|distribute|distribute-space|distribute-letter|distribute-all-lines|disc|disabled|default|decimal|dashed|crosshair|collapse|col-resize|circle|char|center|capitalize|break-word|break-all|bottom|both|bolder|bold|block|bidi-override|below|baseline|auto|always|all-scroll|absolute|table|table-cell)\\b'
      },
      {
        className: 'value',
        begin: ':', end: ';',
        contains: [
          FUNCTION,
          VARIABLE,
          HEXCOLOR,
          hljs.CSS_NUMBER_MODE,
          hljs.QUOTE_STRING_MODE,
          hljs.APOS_STRING_MODE,
          {
            className: 'important', begin: '!important'
          }
        ]
      },
      {
        className: 'at_rule',
        begin: '@', end: '[{;]',
        keywords: 'mixin include extend for if else each while charset import debug media page content font-face namespace warn',
        contains: [
          FUNCTION,
          VARIABLE,
          hljs.QUOTE_STRING_MODE,
          hljs.APOS_STRING_MODE,
          HEXCOLOR,
          hljs.CSS_NUMBER_MODE,
          {
            className: 'preprocessor',
            begin: '\\s[A-Za-z0-9_.-]+',
            relevance: 0
          }
        ]
      }
    ]
  };
};
},{}],117:[function(require,module,exports){
module.exports = function(hljs) {
  var smali_instr_low_prio = ['add', 'and', 'cmp', 'cmpg', 'cmpl', 'const', 'div', 'double', 'float', 'goto', 'if', 'int', 'long', 'move', 'mul', 'neg', 'new', 'nop', 'not', 'or', 'rem', 'return', 'shl', 'shr', 'sput', 'sub', 'throw', 'ushr', 'xor'];
  var smali_instr_high_prio = ['aget', 'aput', 'array', 'check', 'execute', 'fill', 'filled', 'goto/16', 'goto/32', 'iget', 'instance', 'invoke', 'iput', 'monitor', 'packed', 'sget', 'sparse'];
  var smali_keywords = ['transient', 'constructor', 'abstract', 'final', 'synthetic', 'public', 'private', 'protected', 'static', 'bridge', 'system'];
  return {
    aliases: ['smali'],
    contains: [
      {
        className: 'string',
        begin: '"', end: '"',
        relevance: 0
      },
      hljs.COMMENT(
        '#',
        '$',
        {
          relevance: 0
        }
      ),
      {
        className: 'keyword',
        begin: '\\s*\\.end\\s[a-zA-Z0-9]*',
        relevance: 1
      },
      {
        className: 'keyword',
        begin: '^[ ]*\\.[a-zA-Z]*',
        relevance: 0
      },
      {
        className: 'keyword',
        begin: '\\s:[a-zA-Z_0-9]*',
        relevance: 0
      },
      {
        className: 'keyword',
        begin: '\\s('+smali_keywords.join('|')+')',
        relevance: 1
      },
      {
        className: 'keyword',
        begin: '\\[',
        relevance: 0
      },
      {
        className: 'instruction',
        begin: '\\s('+smali_instr_low_prio.join('|')+')\\s',
        relevance: 1
      },
      {
        className: 'instruction',
        begin: '\\s('+smali_instr_low_prio.join('|')+')((\\-|/)[a-zA-Z0-9]+)+\\s',
        relevance: 10
      },
      {
        className: 'instruction',
        begin: '\\s('+smali_instr_high_prio.join('|')+')((\\-|/)[a-zA-Z0-9]+)*\\s',
        relevance: 10
      },
      {
        className: 'class',
        begin: 'L[^\(;:\n]*;',
        relevance: 0
      },
      {
        className: 'function',
        begin: '( |->)[^(\n ;"]*\\(',
        relevance: 0
      },
      {
        className: 'function',
        begin: '\\)',
        relevance: 0
      },
      {
        className: 'variable',
        begin: '[vp][0-9]+',
        relevance: 0
      }
    ]
  };
};
},{}],118:[function(require,module,exports){
module.exports = function(hljs) {
  var VAR_IDENT_RE = '[a-z][a-zA-Z0-9_]*';
  var CHAR = {
    className: 'char',
    begin: '\\$.{1}'
  };
  var SYMBOL = {
    className: 'symbol',
    begin: '#' + hljs.UNDERSCORE_IDENT_RE
  };
  return {
    aliases: ['st'],
    keywords: 'self super nil true false thisContext', // only 6
    contains: [
      hljs.COMMENT('"', '"'),
      hljs.APOS_STRING_MODE,
      {
        className: 'class',
        begin: '\\b[A-Z][A-Za-z0-9_]*',
        relevance: 0
      },
      {
        className: 'method',
        begin: VAR_IDENT_RE + ':',
        relevance: 0
      },
      hljs.C_NUMBER_MODE,
      SYMBOL,
      CHAR,
      {
        className: 'localvars',
        // This looks more complicated than needed to avoid combinatorial
        // explosion under V8. It effectively means `| var1 var2 ... |` with
        // whitespace adjacent to `|` being optional.
        begin: '\\|[ ]*' + VAR_IDENT_RE + '([ ]+' + VAR_IDENT_RE + ')*[ ]*\\|',
        returnBegin: true, end: /\|/,
        illegal: /\S/,
        contains: [{begin: '(\\|[ ]*)?' + VAR_IDENT_RE}]
      },
      {
        className: 'array',
        begin: '\\#\\(', end: '\\)',
        contains: [
          hljs.APOS_STRING_MODE,
          CHAR,
          hljs.C_NUMBER_MODE,
          SYMBOL
        ]
      }
    ]
  };
};
},{}],119:[function(require,module,exports){
module.exports = function(hljs) {
  return {
    aliases: ['ml'],
    keywords: {
      keyword:
        /* according to Definition of Standard ML 97  */
        'abstype and andalso as case datatype do else end eqtype ' +
        'exception fn fun functor handle if in include infix infixr ' +
        'let local nonfix of op open orelse raise rec sharing sig ' +
        'signature struct structure then type val with withtype where while',
      built_in:
        /* built-in types according to basis library */
        'array bool char exn int list option order real ref string substring vector unit word',
      literal:
        'true false NONE SOME LESS EQUAL GREATER nil'
    },
    illegal: /\/\/|>>/,
    lexemes: '[a-z_]\\w*!?',
    contains: [
      {
        className: 'literal',
        begin: '\\[(\\|\\|)?\\]|\\(\\)'
      },
      hljs.COMMENT(
        '\\(\\*',
        '\\*\\)',
        {
          contains: ['self']
        }
      ),
      { /* type variable */
        className: 'symbol',
        begin: '\'[A-Za-z_](?!\')[\\w\']*'
        /* the grammar is ambiguous on how 'a'b should be interpreted but not the compiler */
      },
      { /* polymorphic variant */
        className: 'tag',
        begin: '`[A-Z][\\w\']*'
      },
      { /* module or constructor */
        className: 'type',
        begin: '\\b[A-Z][\\w\']*',
        relevance: 0
      },
      { /* don't color identifiers, but safely catch all identifiers with '*/
        begin: '[a-z_]\\w*\'[\\w\']*'
      },
      hljs.inherit(hljs.APOS_STRING_MODE, {className: 'char', relevance: 0}),
      hljs.inherit(hljs.QUOTE_STRING_MODE, {illegal: null}),
      {
        className: 'number',
        begin:
          '\\b(0[xX][a-fA-F0-9_]+[Lln]?|' +
          '0[oO][0-7_]+[Lln]?|' +
          '0[bB][01_]+[Lln]?|' +
          '[0-9][0-9_]*([Lln]|(\\.[0-9_]*)?([eE][-+]?[0-9_]+)?)?)',
        relevance: 0
      },
      {
        begin: /[-=]>/ // relevance booster
      }
    ]
  };
};
},{}],120:[function(require,module,exports){
module.exports = function(hljs) {
  var COMMENT_MODE = hljs.COMMENT('--', '$');
  return {
    case_insensitive: true,
    illegal: /[<>]/,
    contains: [
      {
        className: 'operator',
        beginKeywords:
          'begin end start commit rollback savepoint lock alter create drop rename call '+
          'delete do handler insert load replace select truncate update set show pragma grant '+
          'merge describe use explain help declare prepare execute deallocate savepoint release '+
          'unlock purge reset change stop analyze cache flush optimize repair kill '+
          'install uninstall checksum restore check backup revoke',
        end: /;/, endsWithParent: true,
        keywords: {
          keyword:
            'abs absolute acos action add adddate addtime aes_decrypt aes_encrypt after aggregate all allocate alter ' +
            'analyze and any are as asc ascii asin assertion at atan atan2 atn2 authorization authors avg backup ' +
            'before begin benchmark between bin binlog bit_and bit_count bit_length bit_or bit_xor both by ' +
            'cache call cascade cascaded case cast catalog ceil ceiling chain change changed char_length ' +
            'character_length charindex charset check checksum checksum_agg choose close coalesce ' +
            'coercibility collate collation collationproperty column columns columns_updated commit compress concat ' +
            'concat_ws concurrent connect connection connection_id consistent constraint constraints continue ' +
            'contributors conv convert convert_tz corresponding cos cot count count_big crc32 create cross cume_dist ' +
            'curdate current current_date current_time current_timestamp current_user cursor curtime data database ' +
            'databases datalength date_add date_format date_sub dateadd datediff datefromparts datename ' +
            'datepart datetime2fromparts datetimeoffsetfromparts day dayname dayofmonth dayofweek dayofyear ' +
            'deallocate declare decode default deferrable deferred degrees delayed delete des_decrypt ' +
            'des_encrypt des_key_file desc describe descriptor diagnostics difference disconnect distinct ' +
            'distinctrow div do domain double drop dumpfile each else elt enclosed encode encrypt end end-exec ' +
            'engine engines eomonth errors escape escaped event eventdata events except exception exec execute ' +
            'exists exp explain export_set extended external extract fast fetch field fields find_in_set ' +
            'first first_value floor flush for force foreign format found found_rows from from_base64 ' +
            'from_days from_unixtime full function get get_format get_lock getdate getutcdate global go goto grant ' +
            'grants greatest group group_concat grouping grouping_id gtid_subset gtid_subtract handler having help ' +
            'hex high_priority hosts hour ident_current ident_incr ident_seed identified identity if ifnull ignore ' +
            'iif ilike immediate in index indicator inet6_aton inet6_ntoa inet_aton inet_ntoa infile initially inner ' +
            'innodb input insert install instr intersect into is is_free_lock is_ipv4 ' +
            'is_ipv4_compat is_ipv4_mapped is_not is_not_null is_used_lock isdate isnull isolation join key kill ' +
            'language last last_day last_insert_id last_value lcase lead leading least leaves left len lenght level ' +
            'like limit lines ln load load_file local localtime localtimestamp locate lock log log10 log2 logfile ' +
            'logs low_priority lower lpad ltrim make_set makedate maketime master master_pos_wait match matched max ' +
            'md5 medium merge microsecond mid min minute mod mode module month monthname mutex name_const names ' +
            'national natural nchar next no no_write_to_binlog not now nullif nvarchar oct ' +
            'octet_length of old_password on only open optimize option optionally or ord order outer outfile output ' +
            'pad parse partial partition password patindex percent_rank percentile_cont percentile_disc period_add ' +
            'period_diff pi plugin position pow power pragma precision prepare preserve primary prior privileges ' +
            'procedure procedure_analyze processlist profile profiles public publishingservername purge quarter ' +
            'query quick quote quotename radians rand read references regexp relative relaylog release ' +
            'release_lock rename repair repeat replace replicate reset restore restrict return returns reverse ' +
            'revoke right rlike rollback rollup round row row_count rows rpad rtrim savepoint schema scroll ' +
            'sec_to_time second section select serializable server session session_user set sha sha1 sha2 share ' +
            'show sign sin size slave sleep smalldatetimefromparts snapshot some soname soundex ' +
            'sounds_like space sql sql_big_result sql_buffer_result sql_cache sql_calc_found_rows sql_no_cache ' +
            'sql_small_result sql_variant_property sqlstate sqrt square start starting status std ' +
            'stddev stddev_pop stddev_samp stdev stdevp stop str str_to_date straight_join strcmp string stuff ' +
            'subdate substr substring subtime subtring_index sum switchoffset sysdate sysdatetime sysdatetimeoffset ' +
            'system_user sysutcdatetime table tables tablespace tan temporary terminated tertiary_weights then time ' +
            'time_format time_to_sec timediff timefromparts timestamp timestampadd timestampdiff timezone_hour ' +
            'timezone_minute to to_base64 to_days to_seconds todatetimeoffset trailing transaction translation ' +
            'trigger trigger_nestlevel triggers trim truncate try_cast try_convert try_parse ucase uncompress ' +
            'uncompressed_length unhex unicode uninstall union unique unix_timestamp unknown unlock update upgrade ' +
            'upped upper usage use user user_resources using utc_date utc_time utc_timestamp uuid uuid_short ' +
            'validate_password_strength value values var var_pop var_samp variables variance varp ' +
            'version view warnings week weekday weekofyear weight_string when whenever where with work write xml ' +
            'xor year yearweek zon',
          literal:
            'true false null',
          built_in:
            'array bigint binary bit blob boolean char character date dec decimal float int integer interval number ' +
            'numeric real serial smallint varchar varying int8 serial8 text'
        },
        contains: [
          {
            className: 'string',
            begin: '\'', end: '\'',
            contains: [hljs.BACKSLASH_ESCAPE, {begin: '\'\''}]
          },
          {
            className: 'string',
            begin: '"', end: '"',
            contains: [hljs.BACKSLASH_ESCAPE, {begin: '""'}]
          },
          {
            className: 'string',
            begin: '`', end: '`',
            contains: [hljs.BACKSLASH_ESCAPE]
          },
          hljs.C_NUMBER_MODE,
          hljs.C_BLOCK_COMMENT_MODE,
          COMMENT_MODE
        ]
      },
      hljs.C_BLOCK_COMMENT_MODE,
      COMMENT_MODE
    ]
  };
};
},{}],121:[function(require,module,exports){
module.exports = function(hljs) {
  return {
    aliases: ['do', 'ado'],
    case_insensitive: true,
    keywords: 'if else in foreach for forv forva forval forvalu forvalue forvalues by bys bysort xi quietly qui capture about ac ac_7 acprplot acprplot_7 adjust ado adopath adoupdate alpha ameans an ano anov anova anova_estat anova_terms anovadef aorder ap app appe appen append arch arch_dr arch_estat arch_p archlm areg areg_p args arima arima_dr arima_estat arima_p as asmprobit asmprobit_estat asmprobit_lf asmprobit_mfx__dlg asmprobit_p ass asse asser assert avplot avplot_7 avplots avplots_7 bcskew0 bgodfrey binreg bip0_lf biplot bipp_lf bipr_lf bipr_p biprobit bitest bitesti bitowt blogit bmemsize boot bootsamp bootstrap bootstrap_8 boxco_l boxco_p boxcox boxcox_6 boxcox_p bprobit br break brier bro brow brows browse brr brrstat bs bs_7 bsampl_w bsample bsample_7 bsqreg bstat bstat_7 bstat_8 bstrap bstrap_7 ca ca_estat ca_p cabiplot camat canon canon_8 canon_8_p canon_estat canon_p cap caprojection capt captu captur capture cat cc cchart cchart_7 cci cd censobs_table centile cf char chdir checkdlgfiles checkestimationsample checkhlpfiles checksum chelp ci cii cl class classutil clear cli clis clist clo clog clog_lf clog_p clogi clogi_sw clogit clogit_lf clogit_p clogitp clogl_sw cloglog clonevar clslistarray cluster cluster_measures cluster_stop cluster_tree cluster_tree_8 clustermat cmdlog cnr cnre cnreg cnreg_p cnreg_sw cnsreg codebook collaps4 collapse colormult_nb colormult_nw compare compress conf confi confir confirm conren cons const constr constra constrai constrain constraint continue contract copy copyright copysource cor corc corr corr2data corr_anti corr_kmo corr_smc corre correl correla correlat correlate corrgram cou coun count cox cox_p cox_sw coxbase coxhaz coxvar cprplot cprplot_7 crc cret cretu cretur creturn cross cs cscript cscript_log csi ct ct_is ctset ctst_5 ctst_st cttost cumsp cumsp_7 cumul cusum cusum_7 cutil d datasig datasign datasigna datasignat datasignatu datasignatur datasignature datetof db dbeta de dec deco decod decode deff des desc descr descri describ describe destring dfbeta dfgls dfuller di di_g dir dirstats dis discard disp disp_res disp_s displ displa display distinct do doe doed doedi doedit dotplot dotplot_7 dprobit drawnorm drop ds ds_util dstdize duplicates durbina dwstat dydx e ed edi edit egen eivreg emdef en enc enco encod encode eq erase ereg ereg_lf ereg_p ereg_sw ereghet ereghet_glf ereghet_glf_sh ereghet_gp ereghet_ilf ereghet_ilf_sh ereghet_ip eret eretu eretur ereturn err erro error est est_cfexist est_cfname est_clickable est_expand est_hold est_table est_unhold est_unholdok estat estat_default estat_summ estat_vce_only esti estimates etodow etof etomdy ex exi exit expand expandcl fac fact facto factor factor_estat factor_p factor_pca_rotated factor_rotate factormat fcast fcast_compute fcast_graph fdades fdadesc fdadescr fdadescri fdadescrib fdadescribe fdasav fdasave fdause fh_st file open file read file close file filefilter fillin find_hlp_file findfile findit findit_7 fit fl fli flis flist for5_0 form forma format fpredict frac_154 frac_adj frac_chk frac_cox frac_ddp frac_dis frac_dv frac_in frac_mun frac_pp frac_pq frac_pv frac_wgt frac_xo fracgen fracplot fracplot_7 fracpoly fracpred fron_ex fron_hn fron_p fron_tn fron_tn2 frontier ftodate ftoe ftomdy ftowdate g gamhet_glf gamhet_gp gamhet_ilf gamhet_ip gamma gamma_d2 gamma_p gamma_sw gammahet gdi_hexagon gdi_spokes ge gen gene gener genera generat generate genrank genstd genvmean gettoken gl gladder gladder_7 glim_l01 glim_l02 glim_l03 glim_l04 glim_l05 glim_l06 glim_l07 glim_l08 glim_l09 glim_l10 glim_l11 glim_l12 glim_lf glim_mu glim_nw1 glim_nw2 glim_nw3 glim_p glim_v1 glim_v2 glim_v3 glim_v4 glim_v5 glim_v6 glim_v7 glm glm_6 glm_p glm_sw glmpred glo glob globa global glogit glogit_8 glogit_p gmeans gnbre_lf gnbreg gnbreg_5 gnbreg_p gomp_lf gompe_sw gomper_p gompertz gompertzhet gomphet_glf gomphet_glf_sh gomphet_gp gomphet_ilf gomphet_ilf_sh gomphet_ip gphdot gphpen gphprint gprefs gprobi_p gprobit gprobit_8 gr gr7 gr_copy gr_current gr_db gr_describe gr_dir gr_draw gr_draw_replay gr_drop gr_edit gr_editviewopts gr_example gr_example2 gr_export gr_print gr_qscheme gr_query gr_read gr_rename gr_replay gr_save gr_set gr_setscheme gr_table gr_undo gr_use graph graph7 grebar greigen greigen_7 greigen_8 grmeanby grmeanby_7 gs_fileinfo gs_filetype gs_graphinfo gs_stat gsort gwood h hadimvo hareg hausman haver he heck_d2 heckma_p heckman heckp_lf heckpr_p heckprob hel help hereg hetpr_lf hetpr_p hetprob hettest hexdump hilite hist hist_7 histogram hlogit hlu hmeans hotel hotelling hprobit hreg hsearch icd9 icd9_ff icd9p iis impute imtest inbase include inf infi infil infile infix inp inpu input ins insheet insp inspe inspec inspect integ inten intreg intreg_7 intreg_p intrg2_ll intrg_ll intrg_ll2 ipolate iqreg ir irf irf_create irfm iri is_svy is_svysum isid istdize ivprob_1_lf ivprob_lf ivprobit ivprobit_p ivreg ivreg_footnote ivtob_1_lf ivtob_lf ivtobit ivtobit_p jackknife jacknife jknife jknife_6 jknife_8 jkstat joinby kalarma1 kap kap_3 kapmeier kappa kapwgt kdensity kdensity_7 keep ksm ksmirnov ktau kwallis l la lab labe label labelbook ladder levels levelsof leverage lfit lfit_p li lincom line linktest lis list lloghet_glf lloghet_glf_sh lloghet_gp lloghet_ilf lloghet_ilf_sh lloghet_ip llogi_sw llogis_p llogist llogistic llogistichet lnorm_lf lnorm_sw lnorma_p lnormal lnormalhet lnormhet_glf lnormhet_glf_sh lnormhet_gp lnormhet_ilf lnormhet_ilf_sh lnormhet_ip lnskew0 loadingplot loc loca local log logi logis_lf logistic logistic_p logit logit_estat logit_p loglogs logrank loneway lookfor lookup lowess lowess_7 lpredict lrecomp lroc lroc_7 lrtest ls lsens lsens_7 lsens_x lstat ltable ltable_7 ltriang lv lvr2plot lvr2plot_7 m ma mac macr macro makecns man manova manova_estat manova_p manovatest mantel mark markin markout marksample mat mat_capp mat_order mat_put_rr mat_rapp mata mata_clear mata_describe mata_drop mata_matdescribe mata_matsave mata_matuse mata_memory mata_mlib mata_mosave mata_rename mata_which matalabel matcproc matlist matname matr matri matrix matrix_input__dlg matstrik mcc mcci md0_ md1_ md1debug_ md2_ md2debug_ mds mds_estat mds_p mdsconfig mdslong mdsmat mdsshepard mdytoe mdytof me_derd mean means median memory memsize meqparse mer merg merge mfp mfx mhelp mhodds minbound mixed_ll mixed_ll_reparm mkassert mkdir mkmat mkspline ml ml_5 ml_adjs ml_bhhhs ml_c_d ml_check ml_clear ml_cnt ml_debug ml_defd ml_e0 ml_e0_bfgs ml_e0_cycle ml_e0_dfp ml_e0i ml_e1 ml_e1_bfgs ml_e1_bhhh ml_e1_cycle ml_e1_dfp ml_e2 ml_e2_cycle ml_ebfg0 ml_ebfr0 ml_ebfr1 ml_ebh0q ml_ebhh0 ml_ebhr0 ml_ebr0i ml_ecr0i ml_edfp0 ml_edfr0 ml_edfr1 ml_edr0i ml_eds ml_eer0i ml_egr0i ml_elf ml_elf_bfgs ml_elf_bhhh ml_elf_cycle ml_elf_dfp ml_elfi ml_elfs ml_enr0i ml_enrr0 ml_erdu0 ml_erdu0_bfgs ml_erdu0_bhhh ml_erdu0_bhhhq ml_erdu0_cycle ml_erdu0_dfp ml_erdu0_nrbfgs ml_exde ml_footnote ml_geqnr ml_grad0 ml_graph ml_hbhhh ml_hd0 ml_hold ml_init ml_inv ml_log ml_max ml_mlout ml_mlout_8 ml_model ml_nb0 ml_opt ml_p ml_plot ml_query ml_rdgrd ml_repor ml_s_e ml_score ml_searc ml_technique ml_unhold mleval mlf_ mlmatbysum mlmatsum mlog mlogi mlogit mlogit_footnote mlogit_p mlopts mlsum mlvecsum mnl0_ mor more mov move mprobit mprobit_lf mprobit_p mrdu0_ mrdu1_ mvdecode mvencode mvreg mvreg_estat n nbreg nbreg_al nbreg_lf nbreg_p nbreg_sw nestreg net newey newey_7 newey_p news nl nl_7 nl_9 nl_9_p nl_p nl_p_7 nlcom nlcom_p nlexp2 nlexp2_7 nlexp2a nlexp2a_7 nlexp3 nlexp3_7 nlgom3 nlgom3_7 nlgom4 nlgom4_7 nlinit nllog3 nllog3_7 nllog4 nllog4_7 nlog_rd nlogit nlogit_p nlogitgen nlogittree nlpred no nobreak noi nois noisi noisil noisily note notes notes_dlg nptrend numlabel numlist odbc old_ver olo olog ologi ologi_sw ologit ologit_p ologitp on one onew onewa oneway op_colnm op_comp op_diff op_inv op_str opr opro oprob oprob_sw oprobi oprobi_p oprobit oprobitp opts_exclusive order orthog orthpoly ou out outf outfi outfil outfile outs outsh outshe outshee outsheet ovtest pac pac_7 palette parse parse_dissim pause pca pca_8 pca_display pca_estat pca_p pca_rotate pcamat pchart pchart_7 pchi pchi_7 pcorr pctile pentium pergram pergram_7 permute permute_8 personal peto_st pkcollapse pkcross pkequiv pkexamine pkexamine_7 pkshape pksumm pksumm_7 pl plo plot plugin pnorm pnorm_7 poisgof poiss_lf poiss_sw poisso_p poisson poisson_estat post postclose postfile postutil pperron pr prais prais_e prais_e2 prais_p predict predictnl preserve print pro prob probi probit probit_estat probit_p proc_time procoverlay procrustes procrustes_estat procrustes_p profiler prog progr progra program prop proportion prtest prtesti pwcorr pwd q\\s qby qbys qchi qchi_7 qladder qladder_7 qnorm qnorm_7 qqplot qqplot_7 qreg qreg_c qreg_p qreg_sw qu quadchk quantile quantile_7 que quer query range ranksum ratio rchart rchart_7 rcof recast reclink recode reg reg3 reg3_p regdw regr regre regre_p2 regres regres_p regress regress_estat regriv_p remap ren rena renam rename renpfix repeat replace report reshape restore ret retu retur return rm rmdir robvar roccomp roccomp_7 roccomp_8 rocf_lf rocfit rocfit_8 rocgold rocplot rocplot_7 roctab roctab_7 rolling rologit rologit_p rot rota rotat rotate rotatemat rreg rreg_p ru run runtest rvfplot rvfplot_7 rvpplot rvpplot_7 sa safesum sample sampsi sav save savedresults saveold sc sca scal scala scalar scatter scm_mine sco scob_lf scob_p scobi_sw scobit scor score scoreplot scoreplot_help scree screeplot screeplot_help sdtest sdtesti se search separate seperate serrbar serrbar_7 serset set set_defaults sfrancia sh she shel shell shewhart shewhart_7 signestimationsample signrank signtest simul simul_7 simulate simulate_8 sktest sleep slogit slogit_d2 slogit_p smooth snapspan so sor sort spearman spikeplot spikeplot_7 spikeplt spline_x split sqreg sqreg_p sret sretu sretur sreturn ssc st st_ct st_hc st_hcd st_hcd_sh st_is st_issys st_note st_promo st_set st_show st_smpl st_subid stack statsby statsby_8 stbase stci stci_7 stcox stcox_estat stcox_fr stcox_fr_ll stcox_p stcox_sw stcoxkm stcoxkm_7 stcstat stcurv stcurve stcurve_7 stdes stem stepwise stereg stfill stgen stir stjoin stmc stmh stphplot stphplot_7 stphtest stphtest_7 stptime strate strate_7 streg streg_sw streset sts sts_7 stset stsplit stsum sttocc sttoct stvary stweib su suest suest_8 sum summ summa summar summari summariz summarize sunflower sureg survcurv survsum svar svar_p svmat svy svy_disp svy_dreg svy_est svy_est_7 svy_estat svy_get svy_gnbreg_p svy_head svy_header svy_heckman_p svy_heckprob_p svy_intreg_p svy_ivreg_p svy_logistic_p svy_logit_p svy_mlogit_p svy_nbreg_p svy_ologit_p svy_oprobit_p svy_poisson_p svy_probit_p svy_regress_p svy_sub svy_sub_7 svy_x svy_x_7 svy_x_p svydes svydes_8 svygen svygnbreg svyheckman svyheckprob svyintreg svyintreg_7 svyintrg svyivreg svylc svylog_p svylogit svymarkout svymarkout_8 svymean svymlog svymlogit svynbreg svyolog svyologit svyoprob svyoprobit svyopts svypois svypois_7 svypoisson svyprobit svyprobt svyprop svyprop_7 svyratio svyreg svyreg_p svyregress svyset svyset_7 svyset_8 svytab svytab_7 svytest svytotal sw sw_8 swcnreg swcox swereg swilk swlogis swlogit swologit swoprbt swpois swprobit swqreg swtobit swweib symmetry symmi symplot symplot_7 syntax sysdescribe sysdir sysuse szroeter ta tab tab1 tab2 tab_or tabd tabdi tabdis tabdisp tabi table tabodds tabodds_7 tabstat tabu tabul tabula tabulat tabulate te tempfile tempname tempvar tes test testnl testparm teststd tetrachoric time_it timer tis tob tobi tobit tobit_p tobit_sw token tokeni tokeniz tokenize tostring total translate translator transmap treat_ll treatr_p treatreg trim trnb_cons trnb_mean trpoiss_d2 trunc_ll truncr_p truncreg tsappend tset tsfill tsline tsline_ex tsreport tsrevar tsrline tsset tssmooth tsunab ttest ttesti tut_chk tut_wait tutorial tw tware_st two twoway twoway__fpfit_serset twoway__function_gen twoway__histogram_gen twoway__ipoint_serset twoway__ipoints_serset twoway__kdensity_gen twoway__lfit_serset twoway__normgen_gen twoway__pci_serset twoway__qfit_serset twoway__scatteri_serset twoway__sunflower_gen twoway_ksm_serset ty typ type typeof u unab unabbrev unabcmd update us use uselabel var var_mkcompanion var_p varbasic varfcast vargranger varirf varirf_add varirf_cgraph varirf_create varirf_ctable varirf_describe varirf_dir varirf_drop varirf_erase varirf_graph varirf_ograph varirf_rename varirf_set varirf_table varlist varlmar varnorm varsoc varstable varstable_w varstable_w2 varwle vce vec vec_fevd vec_mkphi vec_p vec_p_w vecirf_create veclmar veclmar_w vecnorm vecnorm_w vecrank vecstable verinst vers versi versio version view viewsource vif vwls wdatetof webdescribe webseek webuse weib1_lf weib2_lf weib_lf weib_lf0 weibhet_glf weibhet_glf_sh weibhet_glfa weibhet_glfa_sh weibhet_gp weibhet_ilf weibhet_ilf_sh weibhet_ilfa weibhet_ilfa_sh weibhet_ip weibu_sw weibul_p weibull weibull_c weibull_s weibullhet wh whelp whi which whil while wilc_st wilcoxon win wind windo window winexec wntestb wntestb_7 wntestq xchart xchart_7 xcorr xcorr_7 xi xi_6 xmlsav xmlsave xmluse xpose xsh xshe xshel xshell xt_iis xt_tis xtab_p xtabond xtbin_p xtclog xtcloglog xtcloglog_8 xtcloglog_d2 xtcloglog_pa_p xtcloglog_re_p xtcnt_p xtcorr xtdata xtdes xtfront_p xtfrontier xtgee xtgee_elink xtgee_estat xtgee_makeivar xtgee_p xtgee_plink xtgls xtgls_p xthaus xthausman xtht_p xthtaylor xtile xtint_p xtintreg xtintreg_8 xtintreg_d2 xtintreg_p xtivp_1 xtivp_2 xtivreg xtline xtline_ex xtlogit xtlogit_8 xtlogit_d2 xtlogit_fe_p xtlogit_pa_p xtlogit_re_p xtmixed xtmixed_estat xtmixed_p xtnb_fe xtnb_lf xtnbreg xtnbreg_pa_p xtnbreg_refe_p xtpcse xtpcse_p xtpois xtpoisson xtpoisson_d2 xtpoisson_pa_p xtpoisson_refe_p xtpred xtprobit xtprobit_8 xtprobit_d2 xtprobit_re_p xtps_fe xtps_lf xtps_ren xtps_ren_8 xtrar_p xtrc xtrc_p xtrchh xtrefe_p xtreg xtreg_be xtreg_fe xtreg_ml xtreg_pa_p xtreg_re xtregar xtrere_p xtset xtsf_ll xtsf_llti xtsum xttab xttest0 xttobit xttobit_8 xttobit_p xttrans yx yxview__barlike_draw yxview_area_draw yxview_bar_draw yxview_dot_draw yxview_dropline_draw yxview_function_draw yxview_iarrow_draw yxview_ilabels_draw yxview_normal_draw yxview_pcarrow_draw yxview_pcbarrow_draw yxview_pccapsym_draw yxview_pcscatter_draw yxview_pcspike_draw yxview_rarea_draw yxview_rbar_draw yxview_rbarm_draw yxview_rcap_draw yxview_rcapsym_draw yxview_rconnected_draw yxview_rline_draw yxview_rscatter_draw yxview_rspike_draw yxview_spike_draw yxview_sunflower_draw zap_s zinb zinb_llf zinb_plf zip zip_llf zip_p zip_plf zt_ct_5 zt_hc_5 zt_hcd_5 zt_is_5 zt_iss_5 zt_sho_5 zt_smp_5 ztbase_5 ztcox_5 ztdes_5 ztereg_5 ztfill_5 ztgen_5 ztir_5 ztjoin_5 ztnb ztnb_p ztp ztp_p zts_5 ztset_5 ztspli_5 ztsum_5 zttoct_5 ztvary_5 ztweib_5',
        contains: [
      {
        className: 'label',
        variants: [
          {begin: "\\$\\{?[a-zA-Z0-9_]+\\}?"},
          {begin: "`[a-zA-Z0-9_]+'"}

        ]
      },
      {
        className: 'string',
        variants: [
          {begin: '`"[^\r\n]*?"\''},
          {begin: '"[^\r\n"]*"'}
        ]
      },

      {
        className: 'literal',
        variants: [
          {
            begin: '\\b(abs|acos|asin|atan|atan2|atanh|ceil|cloglog|comb|cos|digamma|exp|floor|invcloglog|invlogit|ln|lnfact|lnfactorial|lngamma|log|log10|max|min|mod|reldif|round|sign|sin|sqrt|sum|tan|tanh|trigamma|trunc|betaden|Binomial|binorm|binormal|chi2|chi2tail|dgammapda|dgammapdada|dgammapdadx|dgammapdx|dgammapdxdx|F|Fden|Ftail|gammaden|gammap|ibeta|invbinomial|invchi2|invchi2tail|invF|invFtail|invgammap|invibeta|invnchi2|invnFtail|invnibeta|invnorm|invnormal|invttail|nbetaden|nchi2|nFden|nFtail|nibeta|norm|normal|normalden|normd|npnchi2|tden|ttail|uniform|abbrev|char|index|indexnot|length|lower|ltrim|match|plural|proper|real|regexm|regexr|regexs|reverse|rtrim|string|strlen|strlower|strltrim|strmatch|strofreal|strpos|strproper|strreverse|strrtrim|strtrim|strupper|subinstr|subinword|substr|trim|upper|word|wordcount|_caller|autocode|byteorder|chop|clip|cond|e|epsdouble|epsfloat|group|inlist|inrange|irecode|matrix|maxbyte|maxdouble|maxfloat|maxint|maxlong|mi|minbyte|mindouble|minfloat|minint|minlong|missing|r|recode|replay|return|s|scalar|d|date|day|dow|doy|halfyear|mdy|month|quarter|week|year|d|daily|dofd|dofh|dofm|dofq|dofw|dofy|h|halfyearly|hofd|m|mofd|monthly|q|qofd|quarterly|tin|twithin|w|weekly|wofd|y|yearly|yh|ym|yofd|yq|yw|cholesky|colnumb|colsof|corr|det|diag|diag0cnt|el|get|hadamard|I|inv|invsym|issym|issymmetric|J|matmissing|matuniform|mreldif|nullmat|rownumb|rowsof|sweep|syminv|trace|vec|vecdiag)(?=\\(|$)'
          }
        ]
      },

      hljs.COMMENT('^[ \t]*\\*.*$', false),
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE
    ]
  };
};
},{}],122:[function(require,module,exports){
module.exports = function(hljs) {
  var STEP21_IDENT_RE = '[A-Z_][A-Z0-9_.]*';
  var STEP21_CLOSE_RE = 'END-ISO-10303-21;';
  var STEP21_KEYWORDS = {
    literal: '',
    built_in: '',
    keyword:
    'HEADER ENDSEC DATA'
  };
  var STEP21_START = {
    className: 'preprocessor',
    begin: 'ISO-10303-21;',
    relevance: 10
  };
  var STEP21_CODE = [
    hljs.C_LINE_COMMENT_MODE,
    hljs.C_BLOCK_COMMENT_MODE,
    hljs.COMMENT('/\\*\\*!', '\\*/'),
    hljs.C_NUMBER_MODE,
    hljs.inherit(hljs.APOS_STRING_MODE, {illegal: null}),
    hljs.inherit(hljs.QUOTE_STRING_MODE, {illegal: null}),
    {
      className: 'string',
      begin: "'", end: "'"
    },
    {
      className: 'label',
      variants: [
        {
          begin: '#', end: '\\d+',
          illegal: '\\W'
        }
      ]
    }
  ];

  return {
    aliases: ['p21', 'step', 'stp'],
    case_insensitive: true, // STEP 21 is case insensitive in theory, in practice all non-comments are capitalized.
    lexemes: STEP21_IDENT_RE,
    keywords: STEP21_KEYWORDS,
    contains: [
      {
        className: 'preprocessor',
        begin: STEP21_CLOSE_RE,
        relevance: 10
      },
      STEP21_START
    ].concat(STEP21_CODE)
  };
};
},{}],123:[function(require,module,exports){
module.exports = function(hljs) {

  var VARIABLE = {
    className: 'variable',
    begin: '\\$' + hljs.IDENT_RE
  };

  var HEX_COLOR = {
    className: 'hexcolor',
    begin: '#([a-fA-F0-9]{6}|[a-fA-F0-9]{3})',
    relevance: 10
  };

  var AT_KEYWORDS = [
    'charset',
    'css',
    'debug',
    'extend',
    'font-face',
    'for',
    'import',
    'include',
    'media',
    'mixin',
    'page',
    'warn',
    'while'
  ];

  var PSEUDO_SELECTORS = [
    'after',
    'before',
    'first-letter',
    'first-line',
    'active',
    'first-child',
    'focus',
    'hover',
    'lang',
    'link',
    'visited'
  ];

  var TAGS = [
    'a',
    'abbr',
    'address',
    'article',
    'aside',
    'audio',
    'b',
    'blockquote',
    'body',
    'button',
    'canvas',
    'caption',
    'cite',
    'code',
    'dd',
    'del',
    'details',
    'dfn',
    'div',
    'dl',
    'dt',
    'em',
    'fieldset',
    'figcaption',
    'figure',
    'footer',
    'form',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'header',
    'hgroup',
    'html',
    'i',
    'iframe',
    'img',
    'input',
    'ins',
    'kbd',
    'label',
    'legend',
    'li',
    'mark',
    'menu',
    'nav',
    'object',
    'ol',
    'p',
    'q',
    'quote',
    'samp',
    'section',
    'span',
    'strong',
    'summary',
    'sup',
    'table',
    'tbody',
    'td',
    'textarea',
    'tfoot',
    'th',
    'thead',
    'time',
    'tr',
    'ul',
    'var',
    'video'
  ];

  var TAG_END = '[\\.\\s\\n\\[\\:,]';

  var ATTRIBUTES = [
    'align-content',
    'align-items',
    'align-self',
    'animation',
    'animation-delay',
    'animation-direction',
    'animation-duration',
    'animation-fill-mode',
    'animation-iteration-count',
    'animation-name',
    'animation-play-state',
    'animation-timing-function',
    'auto',
    'backface-visibility',
    'background',
    'background-attachment',
    'background-clip',
    'background-color',
    'background-image',
    'background-origin',
    'background-position',
    'background-repeat',
    'background-size',
    'border',
    'border-bottom',
    'border-bottom-color',
    'border-bottom-left-radius',
    'border-bottom-right-radius',
    'border-bottom-style',
    'border-bottom-width',
    'border-collapse',
    'border-color',
    'border-image',
    'border-image-outset',
    'border-image-repeat',
    'border-image-slice',
    'border-image-source',
    'border-image-width',
    'border-left',
    'border-left-color',
    'border-left-style',
    'border-left-width',
    'border-radius',
    'border-right',
    'border-right-color',
    'border-right-style',
    'border-right-width',
    'border-spacing',
    'border-style',
    'border-top',
    'border-top-color',
    'border-top-left-radius',
    'border-top-right-radius',
    'border-top-style',
    'border-top-width',
    'border-width',
    'bottom',
    'box-decoration-break',
    'box-shadow',
    'box-sizing',
    'break-after',
    'break-before',
    'break-inside',
    'caption-side',
    'clear',
    'clip',
    'clip-path',
    'color',
    'column-count',
    'column-fill',
    'column-gap',
    'column-rule',
    'column-rule-color',
    'column-rule-style',
    'column-rule-width',
    'column-span',
    'column-width',
    'columns',
    'content',
    'counter-increment',
    'counter-reset',
    'cursor',
    'direction',
    'display',
    'empty-cells',
    'filter',
    'flex',
    'flex-basis',
    'flex-direction',
    'flex-flow',
    'flex-grow',
    'flex-shrink',
    'flex-wrap',
    'float',
    'font',
    'font-family',
    'font-feature-settings',
    'font-kerning',
    'font-language-override',
    'font-size',
    'font-size-adjust',
    'font-stretch',
    'font-style',
    'font-variant',
    'font-variant-ligatures',
    'font-weight',
    'height',
    'hyphens',
    'icon',
    'image-orientation',
    'image-rendering',
    'image-resolution',
    'ime-mode',
    'inherit',
    'initial',
    'justify-content',
    'left',
    'letter-spacing',
    'line-height',
    'list-style',
    'list-style-image',
    'list-style-position',
    'list-style-type',
    'margin',
    'margin-bottom',
    'margin-left',
    'margin-right',
    'margin-top',
    'marks',
    'mask',
    'max-height',
    'max-width',
    'min-height',
    'min-width',
    'nav-down',
    'nav-index',
    'nav-left',
    'nav-right',
    'nav-up',
    'none',
    'normal',
    'object-fit',
    'object-position',
    'opacity',
    'order',
    'orphans',
    'outline',
    'outline-color',
    'outline-offset',
    'outline-style',
    'outline-width',
    'overflow',
    'overflow-wrap',
    'overflow-x',
    'overflow-y',
    'padding',
    'padding-bottom',
    'padding-left',
    'padding-right',
    'padding-top',
    'page-break-after',
    'page-break-before',
    'page-break-inside',
    'perspective',
    'perspective-origin',
    'pointer-events',
    'position',
    'quotes',
    'resize',
    'right',
    'tab-size',
    'table-layout',
    'text-align',
    'text-align-last',
    'text-decoration',
    'text-decoration-color',
    'text-decoration-line',
    'text-decoration-style',
    'text-indent',
    'text-overflow',
    'text-rendering',
    'text-shadow',
    'text-transform',
    'text-underline-position',
    'top',
    'transform',
    'transform-origin',
    'transform-style',
    'transition',
    'transition-delay',
    'transition-duration',
    'transition-property',
    'transition-timing-function',
    'unicode-bidi',
    'vertical-align',
    'visibility',
    'white-space',
    'widows',
    'width',
    'word-break',
    'word-spacing',
    'word-wrap',
    'z-index'
  ];

  // illegals
  var ILLEGAL = [
    '\\{',
    '\\}',
    '\\?',
    '(\\bReturn\\b)', // monkey
    '(\\bEnd\\b)', // monkey
    '(\\bend\\b)', // vbscript
    ';', // sql
    '#\\s', // markdown
    '\\*\\s', // markdown
    '===\\s', // markdown
    '\\|',
    '%', // prolog
  ];

  return {
    aliases: ['styl'],
    case_insensitive: false,
    illegal: '(' + ILLEGAL.join('|') + ')',
    keywords: 'if else for in',
    contains: [

      // strings
      hljs.QUOTE_STRING_MODE,
      hljs.APOS_STRING_MODE,

      // comments
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,

      // hex colors
      HEX_COLOR,

      // class tag
      {
        begin: '\\.[a-zA-Z][a-zA-Z0-9_-]*' + TAG_END,
        returnBegin: true,
        contains: [
          {className: 'class', begin: '\\.[a-zA-Z][a-zA-Z0-9_-]*'}
        ]
      },

      // id tag
      {
        begin: '\\#[a-zA-Z][a-zA-Z0-9_-]*' + TAG_END,
        returnBegin: true,
        contains: [
          {className: 'id', begin: '\\#[a-zA-Z][a-zA-Z0-9_-]*'}
        ]
      },

      // tags
      {
        begin: '\\b(' + TAGS.join('|') + ')' + TAG_END,
        returnBegin: true,
        contains: [
          {className: 'tag', begin: '\\b[a-zA-Z][a-zA-Z0-9_-]*'}
        ]
      },

      // psuedo selectors
      {
        className: 'pseudo',
        begin: '&?:?:\\b(' + PSEUDO_SELECTORS.join('|') + ')' + TAG_END
      },

      // @ keywords
      {
        className: 'at_rule',
        begin: '\@(' + AT_KEYWORDS.join('|') + ')\\b'
      },

      // variables
      VARIABLE,

      // dimension
      hljs.CSS_NUMBER_MODE,

      // number
      hljs.NUMBER_MODE,

      // functions
      //  - only from beginning of line + whitespace
      {
        className: 'function',
        begin: '\\b[a-zA-Z][a-zA-Z0-9_\-]*\\(.*\\)',
        illegal: '[\\n]',
        returnBegin: true,
        contains: [
          {className: 'title', begin: '\\b[a-zA-Z][a-zA-Z0-9_\-]*'},
          {
            className: 'params',
            begin: /\(/,
            end: /\)/,
            contains: [
              HEX_COLOR,
              VARIABLE,
              hljs.APOS_STRING_MODE,
              hljs.CSS_NUMBER_MODE,
              hljs.NUMBER_MODE,
              hljs.QUOTE_STRING_MODE
            ]
          }
        ]
      },

      // attributes
      //  - only from beginning of line + whitespace
      //  - must have whitespace after it
      {
        className: 'attribute',
        begin: '\\b(' + ATTRIBUTES.reverse().join('|') + ')\\b'
      }
    ]
  };
};
},{}],124:[function(require,module,exports){
module.exports = function(hljs) {
  var SWIFT_KEYWORDS = {
      keyword: 'class deinit enum extension func import init let protocol static ' +
        'struct subscript typealias var break case continue default do ' +
        'else fallthrough if in for return switch where while as dynamicType ' +
        'is new super self Self Type __COLUMN__ __FILE__ __FUNCTION__ ' +
        '__LINE__ associativity didSet get infix inout left mutating none ' +
        'nonmutating operator override postfix precedence prefix right set '+
        'unowned unowned safe unsafe weak willSet',
      literal: 'true false nil',
      built_in: 'abs advance alignof alignofValue assert bridgeFromObjectiveC ' +
        'bridgeFromObjectiveCUnconditional bridgeToObjectiveC ' +
        'bridgeToObjectiveCUnconditional c contains count countElements ' +
        'countLeadingZeros debugPrint debugPrintln distance dropFirst dropLast dump ' +
        'encodeBitsAsWords enumerate equal filter find getBridgedObjectiveCType ' +
        'getVaList indices insertionSort isBridgedToObjectiveC ' +
        'isBridgedVerbatimToObjectiveC isUniquelyReferenced join ' +
        'lexicographicalCompare map max maxElement min minElement numericCast ' +
        'partition posix print println quickSort reduce reflect reinterpretCast ' +
        'reverse roundUpToAlignment sizeof sizeofValue sort split startsWith strideof ' +
        'strideofValue swap swift toString transcode underestimateCount ' +
        'unsafeReflect withExtendedLifetime withObjectAtPlusZero withUnsafePointer ' +
        'withUnsafePointerToObject withUnsafePointers withVaList'
    };

  var TYPE = {
    className: 'type',
    begin: '\\b[A-Z][\\w\']*',
    relevance: 0
  };
  var BLOCK_COMMENT = hljs.COMMENT(
    '/\\*',
    '\\*/',
    {
      contains: ['self']
    }
  );
  var SUBST = {
    className: 'subst',
    begin: /\\\(/, end: '\\)',
    keywords: SWIFT_KEYWORDS,
    contains: [] // assigned later
  };
  var NUMBERS = {
      className: 'number',
      begin: '\\b([\\d_]+(\\.[\\deE_]+)?|0x[a-fA-F0-9_]+(\\.[a-fA-F0-9p_]+)?|0b[01_]+|0o[0-7_]+)\\b',
      relevance: 0
  };
  var QUOTE_STRING_MODE = hljs.inherit(hljs.QUOTE_STRING_MODE, {
    contains: [SUBST, hljs.BACKSLASH_ESCAPE]
  });
  SUBST.contains = [NUMBERS];

  return {
    keywords: SWIFT_KEYWORDS,
    contains: [
      QUOTE_STRING_MODE,
      hljs.C_LINE_COMMENT_MODE,
      BLOCK_COMMENT,
      TYPE,
      NUMBERS,
      {
        className: 'func',
        beginKeywords: 'func', end: '{', excludeEnd: true,
        contains: [
          hljs.inherit(hljs.TITLE_MODE, {
            begin: /[A-Za-z$_][0-9A-Za-z$_]*/,
            illegal: /\(/
          }),
          {
            className: 'generics',
            begin: /</, end: />/,
            illegal: />/
          },
          {
            className: 'params',
            begin: /\(/, end: /\)/, endsParent: true,
            keywords: SWIFT_KEYWORDS,
            contains: [
              'self',
              NUMBERS,
              QUOTE_STRING_MODE,
              hljs.C_BLOCK_COMMENT_MODE,
              {begin: ':'} // relevance booster
            ],
            illegal: /["']/
          }
        ],
        illegal: /\[|%/
      },
      {
        className: 'class',
        beginKeywords: 'struct protocol class extension enum',
        keywords: SWIFT_KEYWORDS,
        end: '\\{',
        excludeEnd: true,
        contains: [
          hljs.inherit(hljs.TITLE_MODE, {begin: /[A-Za-z$_][0-9A-Za-z$_]*/})
        ]
      },
      {
        className: 'preprocessor', // @attributes
        begin: '(@assignment|@class_protocol|@exported|@final|@lazy|@noreturn|' +
                  '@NSCopying|@NSManaged|@objc|@optional|@required|@auto_closure|' +
                  '@noreturn|@IBAction|@IBDesignable|@IBInspectable|@IBOutlet|' +
                  '@infix|@prefix|@postfix)'
      }
    ]
  };
};
},{}],125:[function(require,module,exports){
module.exports = function(hljs) {
  return {
    aliases: ['tk'],
    keywords: 'after append apply array auto_execok auto_import auto_load auto_mkindex ' +
      'auto_mkindex_old auto_qualify auto_reset bgerror binary break catch cd chan clock ' +
      'close concat continue dde dict encoding eof error eval exec exit expr fblocked ' +
      'fconfigure fcopy file fileevent filename flush for foreach format gets glob global ' +
      'history http if incr info interp join lappend|10 lassign|10 lindex|10 linsert|10 list ' +
      'llength|10 load lrange|10 lrepeat|10 lreplace|10 lreverse|10 lsearch|10 lset|10 lsort|10 '+
      'mathfunc mathop memory msgcat namespace open package parray pid pkg::create pkg_mkIndex '+
      'platform platform::shell proc puts pwd read refchan regexp registry regsub|10 rename '+
      'return safe scan seek set socket source split string subst switch tcl_endOfWord '+
      'tcl_findLibrary tcl_startOfNextWord tcl_startOfPreviousWord tcl_wordBreakAfter '+
      'tcl_wordBreakBefore tcltest tclvars tell time tm trace unknown unload unset update '+
      'uplevel upvar variable vwait while',
    contains: [
      hljs.COMMENT(';[ \\t]*#', '$'),
      hljs.COMMENT('^[ \\t]*#', '$'),
      {
        beginKeywords: 'proc',
        end: '[\\{]',
        excludeEnd: true,
        contains: [
          {
            className: 'symbol',
            begin: '[ \\t\\n\\r]+(::)?[a-zA-Z_]((::)?[a-zA-Z0-9_])*',
            end: '[ \\t\\n\\r]',
            endsWithParent: true,
            excludeEnd: true
          }
        ]
      },
      {
        className: 'variable',
        excludeEnd: true,
        variants: [
          {
            begin: '\\$(\\{)?(::)?[a-zA-Z_]((::)?[a-zA-Z0-9_])*\\(([a-zA-Z0-9_])*\\)',
            end: '[^a-zA-Z0-9_\\}\\$]'
          },
          {
            begin: '\\$(\\{)?(::)?[a-zA-Z_]((::)?[a-zA-Z0-9_])*',
            end: '(\\))?[^a-zA-Z0-9_\\}\\$]'
          }
        ]
      },
      {
        className: 'string',
        contains: [hljs.BACKSLASH_ESCAPE],
        variants: [
          hljs.inherit(hljs.APOS_STRING_MODE, {illegal: null}),
          hljs.inherit(hljs.QUOTE_STRING_MODE, {illegal: null})
        ]
      },
      {
        className: 'number',
        variants: [hljs.BINARY_NUMBER_MODE, hljs.C_NUMBER_MODE]
      }
    ]
  }
};
},{}],126:[function(require,module,exports){
module.exports = function(hljs) {
  var COMMAND1 = {
    className: 'command',
    begin: '\\\\[a-zA-Zа-яА-я]+[\\*]?'
  };
  var COMMAND2 = {
    className: 'command',
    begin: '\\\\[^a-zA-Zа-яА-я0-9]'
  };
  var SPECIAL = {
    className: 'special',
    begin: '[{}\\[\\]\\&#~]',
    relevance: 0
  };

  return {
    contains: [
      { // parameter
        begin: '\\\\[a-zA-Zа-яА-я]+[\\*]? *= *-?\\d*\\.?\\d+(pt|pc|mm|cm|in|dd|cc|ex|em)?',
        returnBegin: true,
        contains: [
          COMMAND1, COMMAND2,
          {
            className: 'number',
            begin: ' *=', end: '-?\\d*\\.?\\d+(pt|pc|mm|cm|in|dd|cc|ex|em)?',
            excludeBegin: true
          }
        ],
        relevance: 10
      },
      COMMAND1, COMMAND2,
      SPECIAL,
      {
        className: 'formula',
        begin: '\\$\\$', end: '\\$\\$',
        contains: [COMMAND1, COMMAND2, SPECIAL],
        relevance: 0
      },
      {
        className: 'formula',
        begin: '\\$', end: '\\$',
        contains: [COMMAND1, COMMAND2, SPECIAL],
        relevance: 0
      },
      hljs.COMMENT(
        '%',
        '$',
        {
          relevance: 0
        }
      )
    ]
  };
};
},{}],127:[function(require,module,exports){
module.exports = function(hljs) {
  var BUILT_IN_TYPES = 'bool byte i16 i32 i64 double string binary';
  return {
    keywords: {
      keyword:
        'namespace const typedef struct enum service exception void oneway set list map required optional',
      built_in:
        BUILT_IN_TYPES,
      literal:
        'true false'
    },
    contains: [
      hljs.QUOTE_STRING_MODE,
      hljs.NUMBER_MODE,
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      {
        className: 'class',
        beginKeywords: 'struct enum service exception', end: /\{/,
        illegal: /\n/,
        contains: [
          hljs.inherit(hljs.TITLE_MODE, {
            starts: {endsWithParent: true, excludeEnd: true} // hack: eating everything after the first title
          })
        ]
      },
      {
        begin: '\\b(set|list|map)\\s*<', end: '>',
        keywords: BUILT_IN_TYPES,
        contains: ['self']
      }
    ]
  };
};
},{}],128:[function(require,module,exports){
module.exports = function(hljs) {
  var TPID = {
    className: 'number',
    begin: '[1-9][0-9]*', /* no leading zeros */
    relevance: 0
  }
  var TPLABEL = {
    className: 'comment',
    begin: ':[^\\]]+'
  }
  var TPDATA = {
    className: 'built_in',
    begin: '(AR|P|PAYLOAD|PR|R|SR|RSR|LBL|VR|UALM|MESSAGE|UTOOL|UFRAME|TIMER|\
    TIMER_OVERFLOW|JOINT_MAX_SPEED|RESUME_PROG|DIAG_REC)\\[', end: '\\]',
    contains: [
      'self',
      TPID,
      TPLABEL
    ]
  };
  var TPIO = {
    className: 'built_in',
    begin: '(AI|AO|DI|DO|F|RI|RO|UI|UO|GI|GO|SI|SO)\\[', end: '\\]',
    contains: [
      'self',
      TPID,
      hljs.QUOTE_STRING_MODE, /* for pos section at bottom */
      TPLABEL
    ]
  };

  return {
    keywords: {
      keyword:
        'ABORT ACC ADJUST AND AP_LD BREAK CALL CNT COL CONDITION CONFIG DA DB ' +
        'DIV DETECT ELSE END ENDFOR ERR_NUM ERROR_PROG FINE FOR GP GUARD INC ' +
        'IF JMP LINEAR_MAX_SPEED LOCK MOD MONITOR OFFSET Offset OR OVERRIDE ' +
        'PAUSE PREG PTH RT_LD RUN SELECT SKIP Skip TA TB TO TOOL_OFFSET ' +
        'Tool_Offset UF UT UFRAME_NUM UTOOL_NUM UNLOCK WAIT X Y Z W P R STRLEN ' +
        'SUBSTR FINDSTR VOFFSET',
      constant:
        'ON OFF max_speed LPOS JPOS ENABLE DISABLE START STOP RESET',
    },
    contains: [
      TPDATA,
      TPIO,
      {
        className: 'keyword',
        begin: '/(PROG|ATTR|MN|POS|END)\\b'
      },
      {
        /* this is for cases like ,CALL */
        className: 'keyword',
        begin: '(CALL|RUN|POINT_LOGIC|LBL)\\b'
      },
      {
        /* this is for cases like CNT100 where the default lexemes do not
         * separate the keyword and the number */
        className: 'keyword',
        begin: '\\b(ACC|CNT|Skip|Offset|PSPD|RT_LD|AP_LD|Tool_Offset)'
      },
      {
        /* to catch numbers that do not have a word boundary on the left */
        className: 'number',
        begin: '\\d+(sec|msec|mm/sec|cm/min|inch/min|deg/sec|mm|in|cm)?\\b',
        relevance: 0
      },
      hljs.COMMENT('//', '[;$]'),
      hljs.COMMENT('!', '[;$]'),
      hljs.COMMENT('--eg:', '$'),
      hljs.QUOTE_STRING_MODE,
      {
        className: 'string',
        begin: '\'', end: '\''
      },
      hljs.C_NUMBER_MODE,
      {
        className: 'variable',
        begin: '\\$[A-Za-z0-9_]+'
      }
    ]
  };
};
},{}],129:[function(require,module,exports){
module.exports = function(hljs) {
  var PARAMS = {
    className: 'params',
    begin: '\\(', end: '\\)'
  };

  var FUNCTION_NAMES = 'attribute block constant cycle date dump include ' +
                  'max min parent random range source template_from_string';

  var FUNCTIONS = {
    className: 'function',
    beginKeywords: FUNCTION_NAMES,
    relevance: 0,
    contains: [
      PARAMS
    ]
  };

  var FILTER = {
    className: 'filter',
    begin: /\|[A-Za-z_]+:?/,
    keywords:
      'abs batch capitalize convert_encoding date date_modify default ' +
      'escape first format join json_encode keys last length lower ' +
      'merge nl2br number_format raw replace reverse round slice sort split ' +
      'striptags title trim upper url_encode',
    contains: [
      FUNCTIONS
    ]
  };

  var TAGS = 'autoescape block do embed extends filter flush for ' +
    'if import include macro sandbox set spaceless use verbatim';

  TAGS = TAGS + ' ' + TAGS.split(' ').map(function(t){return 'end' + t}).join(' ');

  return {
    aliases: ['craftcms'],
    case_insensitive: true,
    subLanguage: 'xml', subLanguageMode: 'continuous',
    contains: [
      hljs.COMMENT(/\{#/, /#}/),
      {
        className: 'template_tag',
        begin: /\{%/, end: /%}/,
        keywords: TAGS,
        contains: [FILTER, FUNCTIONS]
      },
      {
        className: 'variable',
        begin: /\{\{/, end: /}}/,
        contains: [FILTER, FUNCTIONS]
      }
    ]
  };
};
},{}],130:[function(require,module,exports){
module.exports = function(hljs) {
  var KEYWORDS = {
    keyword:
      'in if for while finally var new function|0 do return void else break catch ' +
      'instanceof with throw case default try this switch continue typeof delete ' +
      'let yield const class public private get set super interface extends' +
      'static constructor implements enum export import declare type protected',
    literal:
      'true false null undefined NaN Infinity',
    built_in:
      'eval isFinite isNaN parseFloat parseInt decodeURI decodeURIComponent ' +
      'encodeURI encodeURIComponent escape unescape Object Function Boolean Error ' +
      'EvalError InternalError RangeError ReferenceError StopIteration SyntaxError ' +
      'TypeError URIError Number Math Date String RegExp Array Float32Array ' +
      'Float64Array Int16Array Int32Array Int8Array Uint16Array Uint32Array ' +
      'Uint8Array Uint8ClampedArray ArrayBuffer DataView JSON Intl arguments require ' +
      'module console window document any number boolean string void'
  }

  return {
    aliases: ['ts'],
    keywords: KEYWORDS,
    contains: [
      {
        className: 'pi',
        begin: /^\s*['"]use strict['"]/,
        relevance: 0
      },
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE,
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      {
        className: 'number',
        variants: [
          { begin: '\\b(0[bB][01]+)' },
          { begin: '\\b(0[oO][0-7]+)' },
          { begin: hljs.C_NUMBER_RE }
        ],
        relevance: 0
      },
      { // "value" container
        begin: '(' + hljs.RE_STARTERS_RE + '|\\b(case|return|throw)\\b)\\s*',
        keywords: 'return throw case',
        contains: [
          hljs.C_LINE_COMMENT_MODE,
          hljs.C_BLOCK_COMMENT_MODE,
          hljs.REGEXP_MODE,
          { // E4X
            begin: /</, end: />;/,
            relevance: 0,
            subLanguage: 'xml'
          }
        ],
        relevance: 0
      },
      {
        className: 'function',
        begin: 'function', end: /[\{;]/, excludeEnd: true,
        keywords: KEYWORDS,
        contains: [
          'self',
          hljs.inherit(hljs.TITLE_MODE, {begin: /[A-Za-z$_][0-9A-Za-z$_]*/}),
          {
            className: 'params',
            begin: /\(/, end: /\)/,
            excludeBegin: true,
            excludeEnd: true,
            keywords: KEYWORDS,
            contains: [
              hljs.C_LINE_COMMENT_MODE,
              hljs.C_BLOCK_COMMENT_MODE
            ],
            illegal: /["'\(]/
          }
        ],
        illegal: /\[|%/,
        relevance: 0 // () => {} is more typical in TypeScript
      },
      {
        className: 'constructor',
        begin: 'constructor', end: /\{/, excludeEnd: true,
        keywords: KEYWORDS,
        relevance: 10
      },
      {
        className: 'module',
        beginKeywords: 'module', end: /\{/, excludeEnd: true
      },
      {
        className: 'interface',
        beginKeywords: 'interface', end: /\{/, excludeEnd: true
      },
      {
        begin: /\$[(.]/ // relevance booster for a pattern common to JS libs: `$(something)` and `$.something`
      },
      {
        begin: '\\.' + hljs.IDENT_RE, relevance: 0 // hack: prevents detection of keywords after dots
      }
    ]
  };
};
},{}],131:[function(require,module,exports){
module.exports = function(hljs) {
  return {
    keywords: {
      keyword:
        // Value types
        'char uchar unichar int uint long ulong short ushort int8 int16 int32 int64 uint8 ' +
        'uint16 uint32 uint64 float double bool struct enum string void ' +
        // Reference types
        'weak unowned owned ' +
        // Modifiers
        'async signal static abstract interface override ' +
        // Control Structures
        'while do for foreach else switch case break default return try catch ' +
        // Visibility
        'public private protected internal ' +
        // Other
        'using new this get set const stdout stdin stderr var',
      built_in:
        'DBus GLib CCode Gee Object',
      literal:
        'false true null'
    },
    contains: [
      {
        className: 'class',
        beginKeywords: 'class interface delegate namespace', end: '{', excludeEnd: true,
        illegal: '[^,:\\n\\s\\.]',
        contains: [
          hljs.UNDERSCORE_TITLE_MODE
        ]
      },
      hljs.C_LINE_COMMENT_MODE,
      hljs.C_BLOCK_COMMENT_MODE,
      {
        className: 'string',
        begin: '"""', end: '"""',
        relevance: 5
      },
      hljs.APOS_STRING_MODE,
      hljs.QUOTE_STRING_MODE,
      hljs.C_NUMBER_MODE,
      {
        className: 'preprocessor',
        begin: '^#', end: '$',
        relevance: 2
      },
      {
        className: 'constant',
        begin: ' [A-Z_]+ ',
        relevance: 0
      }
    ]
  };
};
},{}],132:[function(require,module,exports){
module.exports = function(hljs) {
  return {
    aliases: ['vb'],
    case_insensitive: true,
    keywords: {
      keyword:
        'addhandler addressof alias and andalso aggregate ansi as assembly auto binary by byref byval ' + /* a-b */
        'call case catch class compare const continue custom declare default delegate dim distinct do ' + /* c-d */
        'each equals else elseif end enum erase error event exit explicit finally for friend from function ' + /* e-f */
        'get global goto group handles if implements imports in inherits interface into is isfalse isnot istrue ' + /* g-i */
        'join key let lib like loop me mid mod module mustinherit mustoverride mybase myclass ' + /* j-m */
        'namespace narrowing new next not notinheritable notoverridable ' + /* n */
        'of off on operator option optional or order orelse overloads overridable overrides ' + /* o */
        'paramarray partial preserve private property protected public ' + /* p */
        'raiseevent readonly redim rem removehandler resume return ' + /* r */
        'select set shadows shared skip static step stop structure strict sub synclock ' + /* s */
        'take text then throw to try unicode until using when where while widening with withevents writeonly xor', /* t-x */
      built_in:
        'boolean byte cbool cbyte cchar cdate cdec cdbl char cint clng cobj csbyte cshort csng cstr ctype ' +  /* b-c */
        'date decimal directcast double gettype getxmlnamespace iif integer long object ' + /* d-o */
        'sbyte short single string trycast typeof uinteger ulong ushort', /* s-u */
      literal:
        'true false nothing'
    },
    illegal: '//|{|}|endif|gosub|variant|wend', /* reserved deprecated keywords */
    contains: [
      hljs.inherit(hljs.QUOTE_STRING_MODE, {contains: [{begin: '""'}]}),
      hljs.COMMENT(
        '\'',
        '$',
        {
          returnBegin: true,
          contains: [
            {
              className: 'xmlDocTag',
              begin: '\'\'\'|<!--|-->',
              contains: [hljs.PHRASAL_WORDS_MODE]
            },
            {
              className: 'xmlDocTag',
              begin: '</?', end: '>',
              contains: [hljs.PHRASAL_WORDS_MODE]
            }
          ]
        }
      ),
      hljs.C_NUMBER_MODE,
      {
        className: 'preprocessor',
        begin: '#', end: '$',
        keywords: 'if else elseif end region externalsource'
      }
    ]
  };
};
},{}],133:[function(require,module,exports){
module.exports = function(hljs) {
  return {
    subLanguage: 'xml', subLanguageMode: 'continuous',
    contains: [
      {
        begin: '<%', end: '%>',
        subLanguage: 'vbscript'
      }
    ]
  };
};
},{}],134:[function(require,module,exports){
module.exports = function(hljs) {
  return {
    aliases: ['vbs'],
    case_insensitive: true,
    keywords: {
      keyword:
        'call class const dim do loop erase execute executeglobal exit for each next function ' +
        'if then else on error option explicit new private property let get public randomize ' +
        'redim rem select case set stop sub while wend with end to elseif is or xor and not ' +
        'class_initialize class_terminate default preserve in me byval byref step resume goto',
      built_in:
        'lcase month vartype instrrev ubound setlocale getobject rgb getref string ' +
        'weekdayname rnd dateadd monthname now day minute isarray cbool round formatcurrency ' +
        'conversions csng timevalue second year space abs clng timeserial fixs len asc ' +
        'isempty maths dateserial atn timer isobject filter weekday datevalue ccur isdate ' +
        'instr datediff formatdatetime replace isnull right sgn array snumeric log cdbl hex ' +
        'chr lbound msgbox ucase getlocale cos cdate cbyte rtrim join hour oct typename trim ' +
        'strcomp int createobject loadpicture tan formatnumber mid scriptenginebuildversion ' +
        'scriptengine split scriptengineminorversion cint sin datepart ltrim sqr ' +
        'scriptenginemajorversion time derived eval date formatpercent exp inputbox left ascw ' +
        'chrw regexp server response request cstr err',
      literal:
        'true false null nothing empty'
    },
    illegal: '//',
    contains: [
      hljs.inherit(hljs.QUOTE_STRING_MODE, {contains: [{begin: '""'}]}),
      hljs.COMMENT(
        /'/,
        /$/,
        {
          relevance: 0
        }
      ),
      hljs.C_NUMBER_MODE
    ]
  };
};
},{}],135:[function(require,module,exports){
module.exports = function(hljs) {
  return {
    aliases: ['v'],
    case_insensitive: true,
    keywords: {
      keyword:
        'always and assign begin buf bufif0 bufif1 case casex casez cmos deassign ' +
        'default defparam disable edge else end endcase endfunction endmodule ' +
        'endprimitive endspecify endtable endtask event for force forever fork ' +
        'function if ifnone initial inout input join macromodule module nand ' +
        'negedge nmos nor not notif0 notif1 or output parameter pmos posedge ' +
        'primitive pulldown pullup rcmos release repeat rnmos rpmos rtran ' +
        'rtranif0 rtranif1 specify specparam table task timescale tran ' +
        'tranif0 tranif1 wait while xnor xor',
      typename:
        'highz0 highz1 integer large medium pull0 pull1 real realtime reg ' +
        'scalared signed small strong0 strong1 supply0 supply0 supply1 supply1 ' +
        'time tri tri0 tri1 triand trior trireg vectored wand weak0 weak1 wire wor'
    },
    contains: [
      hljs.C_BLOCK_COMMENT_MODE,
      hljs.C_LINE_COMMENT_MODE,
      hljs.QUOTE_STRING_MODE,
      {
        className: 'number',
        begin: '\\b(\\d+\'(b|h|o|d|B|H|O|D))?[0-9xzXZ]+',
        contains: [hljs.BACKSLASH_ESCAPE],
        relevance: 0
      },
      /* ports in instances */
      {
        className: 'typename',
        begin: '\\.\\w+',
        relevance: 0
      },
      /* parameters to instances */
      {
        className: 'value',
        begin: '#\\((?!parameter).+\\)'
      },
      /* operators */
      {
        className: 'keyword',
        begin: '\\+|-|\\*|/|%|<|>|=|#|`|\\!|&|\\||@|:|\\^|~|\\{|\\}',
        relevance: 0
      }
    ]
  }; // return
};
},{}],136:[function(require,module,exports){
module.exports = function(hljs) {
  // Regular expression for VHDL numeric literals.

  // Decimal literal:
  var INTEGER_RE = '\\d(_|\\d)*';
  var EXPONENT_RE = '[eE][-+]?' + INTEGER_RE;
  var DECIMAL_LITERAL_RE = INTEGER_RE + '(\\.' + INTEGER_RE + ')?' + '(' + EXPONENT_RE + ')?';
  // Based literal:
  var BASED_INTEGER_RE = '\\w+';
  var BASED_LITERAL_RE = INTEGER_RE + '#' + BASED_INTEGER_RE + '(\\.' + BASED_INTEGER_RE + ')?' + '#' + '(' + EXPONENT_RE + ')?';

  var NUMBER_RE = '\\b(' + BASED_LITERAL_RE + '|' + DECIMAL_LITERAL_RE + ')';

  return {
    case_insensitive: true,
    keywords: {
      keyword:
        'abs access after alias all and architecture array assert attribute begin block ' +
        'body buffer bus case component configuration constant context cover disconnect ' +
        'downto default else elsif end entity exit fairness file for force function generate ' +
        'generic group guarded if impure in inertial inout is label library linkage literal ' +
        'loop map mod nand new next nor not null of on open or others out package port ' +
        'postponed procedure process property protected pure range record register reject ' +
        'release rem report restrict restrict_guarantee return rol ror select sequence ' +
        'severity shared signal sla sll sra srl strong subtype then to transport type ' +
        'unaffected units until use variable vmode vprop vunit wait when while with xnor xor',
      typename:
        'boolean bit character severity_level integer time delay_length natural positive ' +
        'string bit_vector file_open_kind file_open_status std_ulogic std_ulogic_vector ' +
        'std_logic std_logic_vector unsigned signed boolean_vector integer_vector ' +
        'real_vector time_vector'
    },
    illegal: '{',
    contains: [
      hljs.C_BLOCK_COMMENT_MODE,        // VHDL-2008 block commenting.
      hljs.COMMENT('--', '$'),
      hljs.QUOTE_STRING_MODE,
      {
        className: 'number',
        begin: NUMBER_RE,
        relevance: 0
      },
      {
        className: 'literal',
        begin: '\'(U|X|0|1|Z|W|L|H|-)\'',
        contains: [hljs.BACKSLASH_ESCAPE]
      },
      {
        className: 'attribute',
        begin: '\'[A-Za-z](_?[A-Za-z0-9])*',
        contains: [hljs.BACKSLASH_ESCAPE]
      }
    ]
  };
};
},{}],137:[function(require,module,exports){
module.exports = function(hljs) {
  return {
    lexemes: /[!#@\w]+/,
    keywords: {
      keyword: //ex command
        // express version except: ! & * < = > !! # @ @@
        'N|0 P|0 X|0 a|0 ab abc abo al am an|0 ar arga argd arge argdo argg argl argu as au aug aun b|0 bN ba bad bd be bel bf bl bm bn bo bp br brea breaka breakd breakl bro bufdo buffers bun bw c|0 cN cNf ca cabc caddb cad caddf cal cat cb cc ccl cd ce cex cf cfir cgetb cgete cg changes chd che checkt cl cla clo cm cmapc cme cn cnew cnf cno cnorea cnoreme co col colo com comc comp con conf cope '+
        'cp cpf cq cr cs cst cu cuna cunme cw d|0 delm deb debugg delc delf dif diffg diffo diffp diffpu diffs diffthis dig di dl dell dj dli do doautoa dp dr ds dsp e|0 ea ec echoe echoh echom echon el elsei em en endfo endf endt endw ene ex exe exi exu f|0 files filet fin fina fini fir fix fo foldc foldd folddoc foldo for fu g|0 go gr grepa gu gv ha h|0 helpf helpg helpt hi hid his i|0 ia iabc if ij il im imapc '+
        'ime ino inorea inoreme int is isp iu iuna iunme j|0 ju k|0 keepa kee keepj lN lNf l|0 lad laddb laddf la lan lat lb lc lch lcl lcs le lefta let lex lf lfir lgetb lgete lg lgr lgrepa lh ll lla lli lmak lm lmapc lne lnew lnf ln loadk lo loc lockv lol lope lp lpf lr ls lt lu lua luad luaf lv lvimgrepa lw m|0 ma mak map mapc marks mat me menut mes mk mks mksp mkv mkvie mod mz mzf nbc nb nbs n|0 new nm nmapc nme nn nnoreme noa no noh norea noreme norm nu nun nunme ol o|0 om omapc ome on ono onoreme opt ou ounme ow p|0 '+
        'profd prof pro promptr pc ped pe perld po popu pp pre prev ps pt ptN ptf ptj ptl ptn ptp ptr pts pu pw py3 python3 py3d py3f py pyd pyf q|0 quita qa r|0 rec red redi redr redraws reg res ret retu rew ri rightb rub rubyd rubyf rund ru rv s|0 sN san sa sal sav sb sbN sba sbf sbl sbm sbn sbp sbr scrip scripte scs se setf setg setl sf sfir sh sim sig sil sl sla sm smap smapc sme sn sni sno snor snoreme sor '+
        'so spelld spe spelli spellr spellu spellw sp spr sre st sta startg startr star stopi stj sts sun sunm sunme sus sv sw sy synti sync t|0 tN tabN tabc tabdo tabe tabf tabfir tabl tabm tabnew '+
        'tabn tabo tabp tabr tabs tab ta tags tc tcld tclf te tf th tj tl tm tn to tp tr try ts tu u|0 undoj undol una unh unl unlo unm unme uns up v|0 ve verb vert vim vimgrepa vi viu vie vm vmapc vme vne vn vnoreme vs vu vunme windo w|0 wN wa wh wi winc winp wn wp wq wqa ws wu wv x|0 xa xmapc xm xme xn xnoreme xu xunme y|0 z|0 ~ '+
        // full version
        'Next Print append abbreviate abclear aboveleft all amenu anoremenu args argadd argdelete argedit argglobal arglocal argument ascii autocmd augroup aunmenu buffer bNext ball badd bdelete behave belowright bfirst blast bmodified bnext botright bprevious brewind break breakadd breakdel breaklist browse bunload '+
        'bwipeout change cNext cNfile cabbrev cabclear caddbuffer caddexpr caddfile call catch cbuffer cclose center cexpr cfile cfirst cgetbuffer cgetexpr cgetfile chdir checkpath checktime clist clast close cmap cmapclear cmenu cnext cnewer cnfile cnoremap cnoreabbrev cnoremenu copy colder colorscheme command comclear compiler continue confirm copen cprevious cpfile cquit crewind cscope cstag cunmap '+
        'cunabbrev cunmenu cwindow delete delmarks debug debuggreedy delcommand delfunction diffupdate diffget diffoff diffpatch diffput diffsplit digraphs display deletel djump dlist doautocmd doautoall deletep drop dsearch dsplit edit earlier echo echoerr echohl echomsg else elseif emenu endif endfor '+
        'endfunction endtry endwhile enew execute exit exusage file filetype find finally finish first fixdel fold foldclose folddoopen folddoclosed foldopen function global goto grep grepadd gui gvim hardcopy help helpfind helpgrep helptags highlight hide history insert iabbrev iabclear ijump ilist imap '+
        'imapclear imenu inoremap inoreabbrev inoremenu intro isearch isplit iunmap iunabbrev iunmenu join jumps keepalt keepmarks keepjumps lNext lNfile list laddexpr laddbuffer laddfile last language later lbuffer lcd lchdir lclose lcscope left leftabove lexpr lfile lfirst lgetbuffer lgetexpr lgetfile lgrep lgrepadd lhelpgrep llast llist lmake lmap lmapclear lnext lnewer lnfile lnoremap loadkeymap loadview '+
        'lockmarks lockvar lolder lopen lprevious lpfile lrewind ltag lunmap luado luafile lvimgrep lvimgrepadd lwindow move mark make mapclear match menu menutranslate messages mkexrc mksession mkspell mkvimrc mkview mode mzscheme mzfile nbclose nbkey nbsart next nmap nmapclear nmenu nnoremap '+
        'nnoremenu noautocmd noremap nohlsearch noreabbrev noremenu normal number nunmap nunmenu oldfiles open omap omapclear omenu only onoremap onoremenu options ounmap ounmenu ownsyntax print profdel profile promptfind promptrepl pclose pedit perl perldo pop popup ppop preserve previous psearch ptag ptNext '+
        'ptfirst ptjump ptlast ptnext ptprevious ptrewind ptselect put pwd py3do py3file python pydo pyfile quit quitall qall read recover redo redir redraw redrawstatus registers resize retab return rewind right rightbelow ruby rubydo rubyfile rundo runtime rviminfo substitute sNext sandbox sargument sall saveas sbuffer sbNext sball sbfirst sblast sbmodified sbnext sbprevious sbrewind scriptnames scriptencoding '+
        'scscope set setfiletype setglobal setlocal sfind sfirst shell simalt sign silent sleep slast smagic smapclear smenu snext sniff snomagic snoremap snoremenu sort source spelldump spellgood spellinfo spellrepall spellundo spellwrong split sprevious srewind stop stag startgreplace startreplace '+
        'startinsert stopinsert stjump stselect sunhide sunmap sunmenu suspend sview swapname syntax syntime syncbind tNext tabNext tabclose tabedit tabfind tabfirst tablast tabmove tabnext tabonly tabprevious tabrewind tag tcl tcldo tclfile tearoff tfirst throw tjump tlast tmenu tnext topleft tprevious '+'trewind tselect tunmenu undo undojoin undolist unabbreviate unhide unlet unlockvar unmap unmenu unsilent update vglobal version verbose vertical vimgrep vimgrepadd visual viusage view vmap vmapclear vmenu vnew '+
        'vnoremap vnoremenu vsplit vunmap vunmenu write wNext wall while winsize wincmd winpos wnext wprevious wqall wsverb wundo wviminfo xit xall xmapclear xmap xmenu xnoremap xnoremenu xunmap xunmenu yank',
      built_in: //built in func
        'abs acos add and append argc argidx argv asin atan atan2 browse browsedir bufexists buflisted bufloaded bufname bufnr bufwinnr byte2line byteidx call ceil changenr char2nr cindent clearmatches col complete complete_add complete_check confirm copy cos cosh count cscope_connection cursor '+
        'deepcopy delete did_filetype diff_filler diff_hlID empty escape eval eventhandler executable exists exp expand extend feedkeys filereadable filewritable filter finddir findfile float2nr floor fmod fnameescape fnamemodify foldclosed foldclosedend foldlevel foldtext foldtextresult foreground function '+
        'garbagecollect get getbufline getbufvar getchar getcharmod getcmdline getcmdpos getcmdtype getcwd getfontname getfperm getfsize getftime getftype getline getloclist getmatches getpid getpos getqflist getreg getregtype gettabvar gettabwinvar getwinposx getwinposy getwinvar glob globpath has has_key '+
        'haslocaldir hasmapto histadd histdel histget histnr hlexists hlID hostname iconv indent index input inputdialog inputlist inputrestore inputsave inputsecret insert invert isdirectory islocked items join keys len libcall libcallnr line line2byte lispindent localtime log log10 luaeval map maparg mapcheck '+
        'match matchadd matcharg matchdelete matchend matchlist matchstr max min mkdir mode mzeval nextnonblank nr2char or pathshorten pow prevnonblank printf pumvisible py3eval pyeval range readfile reltime reltimestr remote_expr remote_foreground remote_peek remote_read remote_send remove rename repeat '+
        'resolve reverse round screenattr screenchar screencol screenrow search searchdecl searchpair searchpairpos searchpos server2client serverlist setbufvar setcmdpos setline setloclist setmatches setpos setqflist setreg settabvar settabwinvar setwinvar sha256 shellescape shiftwidth simplify sin '+
        'sinh sort soundfold spellbadword spellsuggest split sqrt str2float str2nr strchars strdisplaywidth strftime stridx string strlen strpart strridx strtrans strwidth submatch substitute synconcealed synID synIDattr '+
        'synIDtrans synstack system tabpagebuflist tabpagenr tabpagewinnr tagfiles taglist tan tanh tempname tolower toupper tr trunc type undofile undotree values virtcol visualmode wildmenumode winbufnr wincol winheight winline winnr winrestcmd winrestview winsaveview winwidth writefile xor'
    },
    illegal: /[{:]/,
    contains: [
      hljs.NUMBER_MODE,
      hljs.APOS_STRING_MODE,
      {
        className: 'string',
        // quote with escape, comment as quote
        begin: /"((\\")|[^"\n])*("|\n)/
      },
      {
        className: 'variable',
        begin: /[bwtglsav]:[\w\d_]*/
      },
      {
        className: 'function',
        beginKeywords: 'function function!', end: '$',
        relevance: 0,
        contains: [
          hljs.TITLE_MODE,
          {
            className: 'params',
            begin: '\\(', end: '\\)'
          }
        ]
      }
    ]
  };
};
},{}],138:[function(require,module,exports){
module.exports = function(hljs) {
  return {
    case_insensitive: true,
    lexemes: '\\.?' + hljs.IDENT_RE,
    keywords: {
      keyword:
        'lock rep repe repz repne repnz xaquire xrelease bnd nobnd ' +
        'aaa aad aam aas adc add and arpl bb0_reset bb1_reset bound bsf bsr bswap bt btc btr bts call cbw cdq cdqe clc cld cli clts cmc cmp cmpsb cmpsd cmpsq cmpsw cmpxchg cmpxchg486 cmpxchg8b cmpxchg16b cpuid cpu_read cpu_write cqo cwd cwde daa das dec div dmint emms enter equ f2xm1 fabs fadd faddp fbld fbstp fchs fclex fcmovb fcmovbe fcmove fcmovnb fcmovnbe fcmovne fcmovnu fcmovu fcom fcomi fcomip fcomp fcompp fcos fdecstp fdisi fdiv fdivp fdivr fdivrp femms feni ffree ffreep fiadd ficom ficomp fidiv fidivr fild fimul fincstp finit fist fistp fisttp fisub fisubr fld fld1 fldcw fldenv fldl2e fldl2t fldlg2 fldln2 fldpi fldz fmul fmulp fnclex fndisi fneni fninit fnop fnsave fnstcw fnstenv fnstsw fpatan fprem fprem1 fptan frndint frstor fsave fscale fsetpm fsin fsincos fsqrt fst fstcw fstenv fstp fstsw fsub fsubp fsubr fsubrp ftst fucom fucomi fucomip fucomp fucompp fxam fxch fxtract fyl2x fyl2xp1 hlt ibts icebp idiv imul in inc incbin insb insd insw int int01 int1 int03 int3 into invd invpcid invlpg invlpga iret iretd iretq iretw jcxz jecxz jrcxz jmp jmpe lahf lar lds lea leave les lfence lfs lgdt lgs lidt lldt lmsw loadall loadall286 lodsb lodsd lodsq lodsw loop loope loopne loopnz loopz lsl lss ltr mfence monitor mov movd movq movsb movsd movsq movsw movsx movsxd movzx mul mwait neg nop not or out outsb outsd outsw packssdw packsswb packuswb paddb paddd paddsb paddsiw paddsw paddusb paddusw paddw pand pandn pause paveb pavgusb pcmpeqb pcmpeqd pcmpeqw pcmpgtb pcmpgtd pcmpgtw pdistib pf2id pfacc pfadd pfcmpeq pfcmpge pfcmpgt pfmax pfmin pfmul pfrcp pfrcpit1 pfrcpit2 pfrsqit1 pfrsqrt pfsub pfsubr pi2fd pmachriw pmaddwd pmagw pmulhriw pmulhrwa pmulhrwc pmulhw pmullw pmvgezb pmvlzb pmvnzb pmvzb pop popa popad popaw popf popfd popfq popfw por prefetch prefetchw pslld psllq psllw psrad psraw psrld psrlq psrlw psubb psubd psubsb psubsiw psubsw psubusb psubusw psubw punpckhbw punpckhdq punpckhwd punpcklbw punpckldq punpcklwd push pusha pushad pushaw pushf pushfd pushfq pushfw pxor rcl rcr rdshr rdmsr rdpmc rdtsc rdtscp ret retf retn rol ror rdm rsdc rsldt rsm rsts sahf sal salc sar sbb scasb scasd scasq scasw sfence sgdt shl shld shr shrd sidt sldt skinit smi smint smintold smsw stc std sti stosb stosd stosq stosw str sub svdc svldt svts swapgs syscall sysenter sysexit sysret test ud0 ud1 ud2b ud2 ud2a umov verr verw fwait wbinvd wrshr wrmsr xadd xbts xchg xlatb xlat xor cmove cmovz cmovne cmovnz cmova cmovnbe cmovae cmovnb cmovb cmovnae cmovbe cmovna cmovg cmovnle cmovge cmovnl cmovl cmovnge cmovle cmovng cmovc cmovnc cmovo cmovno cmovs cmovns cmovp cmovpe cmovnp cmovpo je jz jne jnz ja jnbe jae jnb jb jnae jbe jna jg jnle jge jnl jl jnge jle jng jc jnc jo jno js jns jpo jnp jpe jp sete setz setne setnz seta setnbe setae setnb setnc setb setnae setcset setbe setna setg setnle setge setnl setl setnge setle setng sets setns seto setno setpe setp setpo setnp addps addss andnps andps cmpeqps cmpeqss cmpleps cmpless cmpltps cmpltss cmpneqps cmpneqss cmpnleps cmpnless cmpnltps cmpnltss cmpordps cmpordss cmpunordps cmpunordss cmpps cmpss comiss cvtpi2ps cvtps2pi cvtsi2ss cvtss2si cvttps2pi cvttss2si divps divss ldmxcsr maxps maxss minps minss movaps movhps movlhps movlps movhlps movmskps movntps movss movups mulps mulss orps rcpps rcpss rsqrtps rsqrtss shufps sqrtps sqrtss stmxcsr subps subss ucomiss unpckhps unpcklps xorps fxrstor fxrstor64 fxsave fxsave64 xgetbv xsetbv xsave xsave64 xsaveopt xsaveopt64 xrstor xrstor64 prefetchnta prefetcht0 prefetcht1 prefetcht2 maskmovq movntq pavgb pavgw pextrw pinsrw pmaxsw pmaxub pminsw pminub pmovmskb pmulhuw psadbw pshufw pf2iw pfnacc pfpnacc pi2fw pswapd maskmovdqu clflush movntdq movnti movntpd movdqa movdqu movdq2q movq2dq paddq pmuludq pshufd pshufhw pshuflw pslldq psrldq psubq punpckhqdq punpcklqdq addpd addsd andnpd andpd cmpeqpd cmpeqsd cmplepd cmplesd cmpltpd cmpltsd cmpneqpd cmpneqsd cmpnlepd cmpnlesd cmpnltpd cmpnltsd cmpordpd cmpordsd cmpunordpd cmpunordsd cmppd comisd cvtdq2pd cvtdq2ps cvtpd2dq cvtpd2pi cvtpd2ps cvtpi2pd cvtps2dq cvtps2pd cvtsd2si cvtsd2ss cvtsi2sd cvtss2sd cvttpd2pi cvttpd2dq cvttps2dq cvttsd2si divpd divsd maxpd maxsd minpd minsd movapd movhpd movlpd movmskpd movupd mulpd mulsd orpd shufpd sqrtpd sqrtsd subpd subsd ucomisd unpckhpd unpcklpd xorpd addsubpd addsubps haddpd haddps hsubpd hsubps lddqu movddup movshdup movsldup clgi stgi vmcall vmclear vmfunc vmlaunch vmload vmmcall vmptrld vmptrst vmread vmresume vmrun vmsave vmwrite vmxoff vmxon invept invvpid pabsb pabsw pabsd palignr phaddw phaddd phaddsw phsubw phsubd phsubsw pmaddubsw pmulhrsw pshufb psignb psignw psignd extrq insertq movntsd movntss lzcnt blendpd blendps blendvpd blendvps dppd dpps extractps insertps movntdqa mpsadbw packusdw pblendvb pblendw pcmpeqq pextrb pextrd pextrq phminposuw pinsrb pinsrd pinsrq pmaxsb pmaxsd pmaxud pmaxuw pminsb pminsd pminud pminuw pmovsxbw pmovsxbd pmovsxbq pmovsxwd pmovsxwq pmovsxdq pmovzxbw pmovzxbd pmovzxbq pmovzxwd pmovzxwq pmovzxdq pmuldq pmulld ptest roundpd roundps roundsd roundss crc32 pcmpestri pcmpestrm pcmpistri pcmpistrm pcmpgtq popcnt getsec pfrcpv pfrsqrtv movbe aesenc aesenclast aesdec aesdeclast aesimc aeskeygenassist vaesenc vaesenclast vaesdec vaesdeclast vaesimc vaeskeygenassist vaddpd vaddps vaddsd vaddss vaddsubpd vaddsubps vandpd vandps vandnpd vandnps vblendpd vblendps vblendvpd vblendvps vbroadcastss vbroadcastsd vbroadcastf128 vcmpeq_ospd vcmpeqpd vcmplt_ospd vcmpltpd vcmple_ospd vcmplepd vcmpunord_qpd vcmpunordpd vcmpneq_uqpd vcmpneqpd vcmpnlt_uspd vcmpnltpd vcmpnle_uspd vcmpnlepd vcmpord_qpd vcmpordpd vcmpeq_uqpd vcmpnge_uspd vcmpngepd vcmpngt_uspd vcmpngtpd vcmpfalse_oqpd vcmpfalsepd vcmpneq_oqpd vcmpge_ospd vcmpgepd vcmpgt_ospd vcmpgtpd vcmptrue_uqpd vcmptruepd vcmplt_oqpd vcmple_oqpd vcmpunord_spd vcmpneq_uspd vcmpnlt_uqpd vcmpnle_uqpd vcmpord_spd vcmpeq_uspd vcmpnge_uqpd vcmpngt_uqpd vcmpfalse_ospd vcmpneq_ospd vcmpge_oqpd vcmpgt_oqpd vcmptrue_uspd vcmppd vcmpeq_osps vcmpeqps vcmplt_osps vcmpltps vcmple_osps vcmpleps vcmpunord_qps vcmpunordps vcmpneq_uqps vcmpneqps vcmpnlt_usps vcmpnltps vcmpnle_usps vcmpnleps vcmpord_qps vcmpordps vcmpeq_uqps vcmpnge_usps vcmpngeps vcmpngt_usps vcmpngtps vcmpfalse_oqps vcmpfalseps vcmpneq_oqps vcmpge_osps vcmpgeps vcmpgt_osps vcmpgtps vcmptrue_uqps vcmptrueps vcmplt_oqps vcmple_oqps vcmpunord_sps vcmpneq_usps vcmpnlt_uqps vcmpnle_uqps vcmpord_sps vcmpeq_usps vcmpnge_uqps vcmpngt_uqps vcmpfalse_osps vcmpneq_osps vcmpge_oqps vcmpgt_oqps vcmptrue_usps vcmpps vcmpeq_ossd vcmpeqsd vcmplt_ossd vcmpltsd vcmple_ossd vcmplesd vcmpunord_qsd vcmpunordsd vcmpneq_uqsd vcmpneqsd vcmpnlt_ussd vcmpnltsd vcmpnle_ussd vcmpnlesd vcmpord_qsd vcmpordsd vcmpeq_uqsd vcmpnge_ussd vcmpngesd vcmpngt_ussd vcmpngtsd vcmpfalse_oqsd vcmpfalsesd vcmpneq_oqsd vcmpge_ossd vcmpgesd vcmpgt_ossd vcmpgtsd vcmptrue_uqsd vcmptruesd vcmplt_oqsd vcmple_oqsd vcmpunord_ssd vcmpneq_ussd vcmpnlt_uqsd vcmpnle_uqsd vcmpord_ssd vcmpeq_ussd vcmpnge_uqsd vcmpngt_uqsd vcmpfalse_ossd vcmpneq_ossd vcmpge_oqsd vcmpgt_oqsd vcmptrue_ussd vcmpsd vcmpeq_osss vcmpeqss vcmplt_osss vcmpltss vcmple_osss vcmpless vcmpunord_qss vcmpunordss vcmpneq_uqss vcmpneqss vcmpnlt_usss vcmpnltss vcmpnle_usss vcmpnless vcmpord_qss vcmpordss vcmpeq_uqss vcmpnge_usss vcmpngess vcmpngt_usss vcmpngtss vcmpfalse_oqss vcmpfalsess vcmpneq_oqss vcmpge_osss vcmpgess vcmpgt_osss vcmpgtss vcmptrue_uqss vcmptruess vcmplt_oqss vcmple_oqss vcmpunord_sss vcmpneq_usss vcmpnlt_uqss vcmpnle_uqss vcmpord_sss vcmpeq_usss vcmpnge_uqss vcmpngt_uqss vcmpfalse_osss vcmpneq_osss vcmpge_oqss vcmpgt_oqss vcmptrue_usss vcmpss vcomisd vcomiss vcvtdq2pd vcvtdq2ps vcvtpd2dq vcvtpd2ps vcvtps2dq vcvtps2pd vcvtsd2si vcvtsd2ss vcvtsi2sd vcvtsi2ss vcvtss2sd vcvtss2si vcvttpd2dq vcvttps2dq vcvttsd2si vcvttss2si vdivpd vdivps vdivsd vdivss vdppd vdpps vextractf128 vextractps vhaddpd vhaddps vhsubpd vhsubps vinsertf128 vinsertps vlddqu vldqqu vldmxcsr vmaskmovdqu vmaskmovps vmaskmovpd vmaxpd vmaxps vmaxsd vmaxss vminpd vminps vminsd vminss vmovapd vmovaps vmovd vmovq vmovddup vmovdqa vmovqqa vmovdqu vmovqqu vmovhlps vmovhpd vmovhps vmovlhps vmovlpd vmovlps vmovmskpd vmovmskps vmovntdq vmovntqq vmovntdqa vmovntpd vmovntps vmovsd vmovshdup vmovsldup vmovss vmovupd vmovups vmpsadbw vmulpd vmulps vmulsd vmulss vorpd vorps vpabsb vpabsw vpabsd vpacksswb vpackssdw vpackuswb vpackusdw vpaddb vpaddw vpaddd vpaddq vpaddsb vpaddsw vpaddusb vpaddusw vpalignr vpand vpandn vpavgb vpavgw vpblendvb vpblendw vpcmpestri vpcmpestrm vpcmpistri vpcmpistrm vpcmpeqb vpcmpeqw vpcmpeqd vpcmpeqq vpcmpgtb vpcmpgtw vpcmpgtd vpcmpgtq vpermilpd vpermilps vperm2f128 vpextrb vpextrw vpextrd vpextrq vphaddw vphaddd vphaddsw vphminposuw vphsubw vphsubd vphsubsw vpinsrb vpinsrw vpinsrd vpinsrq vpmaddwd vpmaddubsw vpmaxsb vpmaxsw vpmaxsd vpmaxub vpmaxuw vpmaxud vpminsb vpminsw vpminsd vpminub vpminuw vpminud vpmovmskb vpmovsxbw vpmovsxbd vpmovsxbq vpmovsxwd vpmovsxwq vpmovsxdq vpmovzxbw vpmovzxbd vpmovzxbq vpmovzxwd vpmovzxwq vpmovzxdq vpmulhuw vpmulhrsw vpmulhw vpmullw vpmulld vpmuludq vpmuldq vpor vpsadbw vpshufb vpshufd vpshufhw vpshuflw vpsignb vpsignw vpsignd vpslldq vpsrldq vpsllw vpslld vpsllq vpsraw vpsrad vpsrlw vpsrld vpsrlq vptest vpsubb vpsubw vpsubd vpsubq vpsubsb vpsubsw vpsubusb vpsubusw vpunpckhbw vpunpckhwd vpunpckhdq vpunpckhqdq vpunpcklbw vpunpcklwd vpunpckldq vpunpcklqdq vpxor vrcpps vrcpss vrsqrtps vrsqrtss vroundpd vroundps vroundsd vroundss vshufpd vshufps vsqrtpd vsqrtps vsqrtsd vsqrtss vstmxcsr vsubpd vsubps vsubsd vsubss vtestps vtestpd vucomisd vucomiss vunpckhpd vunpckhps vunpcklpd vunpcklps vxorpd vxorps vzeroall vzeroupper pclmullqlqdq pclmulhqlqdq pclmullqhqdq pclmulhqhqdq pclmulqdq vpclmullqlqdq vpclmulhqlqdq vpclmullqhqdq vpclmulhqhqdq vpclmulqdq vfmadd132ps vfmadd132pd vfmadd312ps vfmadd312pd vfmadd213ps vfmadd213pd vfmadd123ps vfmadd123pd vfmadd231ps vfmadd231pd vfmadd321ps vfmadd321pd vfmaddsub132ps vfmaddsub132pd vfmaddsub312ps vfmaddsub312pd vfmaddsub213ps vfmaddsub213pd vfmaddsub123ps vfmaddsub123pd vfmaddsub231ps vfmaddsub231pd vfmaddsub321ps vfmaddsub321pd vfmsub132ps vfmsub132pd vfmsub312ps vfmsub312pd vfmsub213ps vfmsub213pd vfmsub123ps vfmsub123pd vfmsub231ps vfmsub231pd vfmsub321ps vfmsub321pd vfmsubadd132ps vfmsubadd132pd vfmsubadd312ps vfmsubadd312pd vfmsubadd213ps vfmsubadd213pd vfmsubadd123ps vfmsubadd123pd vfmsubadd231ps vfmsubadd231pd vfmsubadd321ps vfmsubadd321pd vfnmadd132ps vfnmadd132pd vfnmadd312ps vfnmadd312pd vfnmadd213ps vfnmadd213pd vfnmadd123ps vfnmadd123pd vfnmadd231ps vfnmadd231pd vfnmadd321ps vfnmadd321pd vfnmsub132ps vfnmsub132pd vfnmsub312ps vfnmsub312pd vfnmsub213ps vfnmsub213pd vfnmsub123ps vfnmsub123pd vfnmsub231ps vfnmsub231pd vfnmsub321ps vfnmsub321pd vfmadd132ss vfmadd132sd vfmadd312ss vfmadd312sd vfmadd213ss vfmadd213sd vfmadd123ss vfmadd123sd vfmadd231ss vfmadd231sd vfmadd321ss vfmadd321sd vfmsub132ss vfmsub132sd vfmsub312ss vfmsub312sd vfmsub213ss vfmsub213sd vfmsub123ss vfmsub123sd vfmsub231ss vfmsub231sd vfmsub321ss vfmsub321sd vfnmadd132ss vfnmadd132sd vfnmadd312ss vfnmadd312sd vfnmadd213ss vfnmadd213sd vfnmadd123ss vfnmadd123sd vfnmadd231ss vfnmadd231sd vfnmadd321ss vfnmadd321sd vfnmsub132ss vfnmsub132sd vfnmsub312ss vfnmsub312sd vfnmsub213ss vfnmsub213sd vfnmsub123ss vfnmsub123sd vfnmsub231ss vfnmsub231sd vfnmsub321ss vfnmsub321sd rdfsbase rdgsbase rdrand wrfsbase wrgsbase vcvtph2ps vcvtps2ph adcx adox rdseed clac stac xstore xcryptecb xcryptcbc xcryptctr xcryptcfb xcryptofb montmul xsha1 xsha256 llwpcb slwpcb lwpval lwpins vfmaddpd vfmaddps vfmaddsd vfmaddss vfmaddsubpd vfmaddsubps vfmsubaddpd vfmsubaddps vfmsubpd vfmsubps vfmsubsd vfmsubss vfnmaddpd vfnmaddps vfnmaddsd vfnmaddss vfnmsubpd vfnmsubps vfnmsubsd vfnmsubss vfrczpd vfrczps vfrczsd vfrczss vpcmov vpcomb vpcomd vpcomq vpcomub vpcomud vpcomuq vpcomuw vpcomw vphaddbd vphaddbq vphaddbw vphadddq vphaddubd vphaddubq vphaddubw vphaddudq vphadduwd vphadduwq vphaddwd vphaddwq vphsubbw vphsubdq vphsubwd vpmacsdd vpmacsdqh vpmacsdql vpmacssdd vpmacssdqh vpmacssdql vpmacsswd vpmacssww vpmacswd vpmacsww vpmadcsswd vpmadcswd vpperm vprotb vprotd vprotq vprotw vpshab vpshad vpshaq vpshaw vpshlb vpshld vpshlq vpshlw vbroadcasti128 vpblendd vpbroadcastb vpbroadcastw vpbroadcastd vpbroadcastq vpermd vpermpd vpermps vpermq vperm2i128 vextracti128 vinserti128 vpmaskmovd vpmaskmovq vpsllvd vpsllvq vpsravd vpsrlvd vpsrlvq vgatherdpd vgatherqpd vgatherdps vgatherqps vpgatherdd vpgatherqd vpgatherdq vpgatherqq xabort xbegin xend xtest andn bextr blci blcic blsi blsic blcfill blsfill blcmsk blsmsk blsr blcs bzhi mulx pdep pext rorx sarx shlx shrx tzcnt tzmsk t1mskc valignd valignq vblendmpd vblendmps vbroadcastf32x4 vbroadcastf64x4 vbroadcasti32x4 vbroadcasti64x4 vcompresspd vcompressps vcvtpd2udq vcvtps2udq vcvtsd2usi vcvtss2usi vcvttpd2udq vcvttps2udq vcvttsd2usi vcvttss2usi vcvtudq2pd vcvtudq2ps vcvtusi2sd vcvtusi2ss vexpandpd vexpandps vextractf32x4 vextractf64x4 vextracti32x4 vextracti64x4 vfixupimmpd vfixupimmps vfixupimmsd vfixupimmss vgetexppd vgetexpps vgetexpsd vgetexpss vgetmantpd vgetmantps vgetmantsd vgetmantss vinsertf32x4 vinsertf64x4 vinserti32x4 vinserti64x4 vmovdqa32 vmovdqa64 vmovdqu32 vmovdqu64 vpabsq vpandd vpandnd vpandnq vpandq vpblendmd vpblendmq vpcmpltd vpcmpled vpcmpneqd vpcmpnltd vpcmpnled vpcmpd vpcmpltq vpcmpleq vpcmpneqq vpcmpnltq vpcmpnleq vpcmpq vpcmpequd vpcmpltud vpcmpleud vpcmpnequd vpcmpnltud vpcmpnleud vpcmpud vpcmpequq vpcmpltuq vpcmpleuq vpcmpnequq vpcmpnltuq vpcmpnleuq vpcmpuq vpcompressd vpcompressq vpermi2d vpermi2pd vpermi2ps vpermi2q vpermt2d vpermt2pd vpermt2ps vpermt2q vpexpandd vpexpandq vpmaxsq vpmaxuq vpminsq vpminuq vpmovdb vpmovdw vpmovqb vpmovqd vpmovqw vpmovsdb vpmovsdw vpmovsqb vpmovsqd vpmovsqw vpmovusdb vpmovusdw vpmovusqb vpmovusqd vpmovusqw vpord vporq vprold vprolq vprolvd vprolvq vprord vprorq vprorvd vprorvq vpscatterdd vpscatterdq vpscatterqd vpscatterqq vpsraq vpsravq vpternlogd vpternlogq vptestmd vptestmq vptestnmd vptestnmq vpxord vpxorq vrcp14pd vrcp14ps vrcp14sd vrcp14ss vrndscalepd vrndscaleps vrndscalesd vrndscaless vrsqrt14pd vrsqrt14ps vrsqrt14sd vrsqrt14ss vscalefpd vscalefps vscalefsd vscalefss vscatterdpd vscatterdps vscatterqpd vscatterqps vshuff32x4 vshuff64x2 vshufi32x4 vshufi64x2 kandnw kandw kmovw knotw kortestw korw kshiftlw kshiftrw kunpckbw kxnorw kxorw vpbroadcastmb2q vpbroadcastmw2d vpconflictd vpconflictq vplzcntd vplzcntq vexp2pd vexp2ps vrcp28pd vrcp28ps vrcp28sd vrcp28ss vrsqrt28pd vrsqrt28ps vrsqrt28sd vrsqrt28ss vgatherpf0dpd vgatherpf0dps vgatherpf0qpd vgatherpf0qps vgatherpf1dpd vgatherpf1dps vgatherpf1qpd vgatherpf1qps vscatterpf0dpd vscatterpf0dps vscatterpf0qpd vscatterpf0qps vscatterpf1dpd vscatterpf1dps vscatterpf1qpd vscatterpf1qps prefetchwt1 bndmk bndcl bndcu bndcn bndmov bndldx bndstx sha1rnds4 sha1nexte sha1msg1 sha1msg2 sha256rnds2 sha256msg1 sha256msg2 hint_nop0 hint_nop1 hint_nop2 hint_nop3 hint_nop4 hint_nop5 hint_nop6 hint_nop7 hint_nop8 hint_nop9 hint_nop10 hint_nop11 hint_nop12 hint_nop13 hint_nop14 hint_nop15 hint_nop16 hint_nop17 hint_nop18 hint_nop19 hint_nop20 hint_nop21 hint_nop22 hint_nop23 hint_nop24 hint_nop25 hint_nop26 hint_nop27 hint_nop28 hint_nop29 hint_nop30 hint_nop31 hint_nop32 hint_nop33 hint_nop34 hint_nop35 hint_nop36 hint_nop37 hint_nop38 hint_nop39 hint_nop40 hint_nop41 hint_nop42 hint_nop43 hint_nop44 hint_nop45 hint_nop46 hint_nop47 hint_nop48 hint_nop49 hint_nop50 hint_nop51 hint_nop52 hint_nop53 hint_nop54 hint_nop55 hint_nop56 hint_nop57 hint_nop58 hint_nop59 hint_nop60 hint_nop61 hint_nop62 hint_nop63',
      literal:
        // Instruction pointer
        'ip eip rip ' +
        // 8-bit registers
        'al ah bl bh cl ch dl dh sil dil bpl spl r8b r9b r10b r11b r12b r13b r14b r15b ' +
        // 16-bit registers
        'ax bx cx dx si di bp sp r8w r9w r10w r11w r12w r13w r14w r15w ' +
        // 32-bit registers
        'eax ebx ecx edx esi edi ebp esp eip r8d r9d r10d r11d r12d r13d r14d r15d ' +
        // 64-bit registers
        'rax rbx rcx rdx rsi rdi rbp rsp r8 r9 r10 r11 r12 r13 r14 r15 ' +
        // Segment registers
        'cs ds es fs gs ss ' +
        // Floating point stack registers
        'st st0 st1 st2 st3 st4 st5 st6 st7 ' +
        // MMX Registers
        'mm0 mm1 mm2 mm3 mm4 mm5 mm6 mm7 ' +
        // SSE registers
        'xmm0  xmm1  xmm2  xmm3  xmm4  xmm5  xmm6  xmm7  xmm8  xmm9 xmm10  xmm11 xmm12 xmm13 xmm14 xmm15 ' +
        'xmm16 xmm17 xmm18 xmm19 xmm20 xmm21 xmm22 xmm23 xmm24 xmm25 xmm26 xmm27 xmm28 xmm29 xmm30 xmm31 ' +
        // AVX registers
        'ymm0  ymm1  ymm2  ymm3  ymm4  ymm5  ymm6  ymm7  ymm8  ymm9 ymm10  ymm11 ymm12 ymm13 ymm14 ymm15 ' +
        'ymm16 ymm17 ymm18 ymm19 ymm20 ymm21 ymm22 ymm23 ymm24 ymm25 ymm26 ymm27 ymm28 ymm29 ymm30 ymm31 ' +
        // AVX-512F registers
        'zmm0  zmm1  zmm2  zmm3  zmm4  zmm5  zmm6  zmm7  zmm8  zmm9 zmm10  zmm11 zmm12 zmm13 zmm14 zmm15 ' +
        'zmm16 zmm17 zmm18 zmm19 zmm20 zmm21 zmm22 zmm23 zmm24 zmm25 zmm26 zmm27 zmm28 zmm29 zmm30 zmm31 ' +
        // AVX-512F mask registers
        'k0 k1 k2 k3 k4 k5 k6 k7 ' +
        // Bound (MPX) register
        'bnd0 bnd1 bnd2 bnd3 ' +
        // Special register
        'cr0 cr1 cr2 cr3 cr4 cr8 dr0 dr1 dr2 dr3 dr8 tr3 tr4 tr5 tr6 tr7 ' +
        // NASM altreg package
        'r0 r1 r2 r3 r4 r5 r6 r7 r0b r1b r2b r3b r4b r5b r6b r7b ' +
        'r0w r1w r2w r3w r4w r5w r6w r7w r0d r1d r2d r3d r4d r5d r6d r7d ' +
        'r0h r1h r2h r3h ' +
        'r0l r1l r2l r3l r4l r5l r6l r7l r8l r9l r10l r11l r12l r13l r14l r15l',

      pseudo:
        'db dw dd dq dt ddq do dy dz ' +
        'resb resw resd resq rest resdq reso resy resz ' +
        'incbin equ times',

      preprocessor:
        '%define %xdefine %+ %undef %defstr %deftok %assign %strcat %strlen %substr %rotate %elif %else %endif ' +
        '%ifmacro %ifctx %ifidn %ifidni %ifid %ifnum %ifstr %iftoken %ifempty %ifenv %error %warning %fatal %rep ' +
        '%endrep %include %push %pop %repl %pathsearch %depend %use %arg %stacksize %local %line %comment %endcomment ' +
        '.nolist ' +
        'byte word dword qword nosplit rel abs seg wrt strict near far a32 ptr ' +
        '__FILE__ __LINE__ __SECT__  __BITS__ __OUTPUT_FORMAT__ __DATE__ __TIME__ __DATE_NUM__ __TIME_NUM__ ' +
        '__UTC_DATE__ __UTC_TIME__ __UTC_DATE_NUM__ __UTC_TIME_NUM__  __PASS__ struc endstruc istruc at iend ' +
        'align alignb sectalign daz nodaz up down zero default option assume public ',

      built_in:
        'bits use16 use32 use64 default section segment absolute extern global common cpu float ' +
        '__utf16__ __utf16le__ __utf16be__ __utf32__ __utf32le__ __utf32be__ ' +
        '__float8__ __float16__ __float32__ __float64__ __float80m__ __float80e__ __float128l__ __float128h__ ' +
        '__Infinity__ __QNaN__ __SNaN__ Inf NaN QNaN SNaN float8 float16 float32 float64 float80m float80e ' +
        'float128l float128h __FLOAT_DAZ__ __FLOAT_ROUND__ __FLOAT__'
    },
    contains: [
      hljs.COMMENT(
        ';',
        '$',
        {
          relevance: 0
        }
      ),
      // Float number and x87 BCD
      {
        className: 'number',
        begin: '\\b(?:([0-9][0-9_]*)?\\.[0-9_]*(?:[eE][+-]?[0-9_]+)?|(0[Xx])?[0-9][0-9_]*\\.?[0-9_]*(?:[pP](?:[+-]?[0-9_]+)?)?)\\b',
        relevance: 0
      },
      // Hex number in $
      {
        className: 'number',
        begin: '\\$[0-9][0-9A-Fa-f]*',
        relevance: 0
      },
      // Number in H,X,D,T,Q,O,B,Y suffix
      {
        className: 'number',
        begin: '\\b(?:[0-9A-Fa-f][0-9A-Fa-f_]*[HhXx]|[0-9][0-9_]*[DdTt]?|[0-7][0-7_]*[QqOo]|[0-1][0-1_]*[BbYy])\\b'
      },
      // Number in H,X,D,T,Q,O,B,Y prefix
      {
        className: 'number',
        begin: '\\b(?:0[HhXx][0-9A-Fa-f_]+|0[DdTt][0-9_]+|0[QqOo][0-7_]+|0[BbYy][0-1_]+)\\b'
      },
      // Double quote string
      hljs.QUOTE_STRING_MODE,
      // Single-quoted string
      {
        className: 'string',
        begin: '\'',
        end: '[^\\\\]\'',
        relevance: 0
      },
      // Backquoted string
      {
        className: 'string',
        begin: '`',
        end: '[^\\\\]`',
        relevance: 0
      },
      // Section name
      {
        className: 'string',
        begin: '\\.[A-Za-z0-9]+',
        relevance: 0
      },
      // Global label and local label
      {
        className: 'label',
        begin: '^\\s*[A-Za-z._?][A-Za-z0-9_$#@~.?]*(:|\\s+label)',
        relevance: 0
      },
      // Macro-local label
      {
        className: 'label',
        begin: '^\\s*%%[A-Za-z0-9_$#@~.?]*:',
        relevance: 0
      },
      // Macro parameter
      {
        className: 'argument',
        begin: '%[0-9]+',
        relevance: 0
      },
      // Macro parameter
      {
        className: 'built_in',
        begin: '%!\S+',
        relevance: 0
      }
    ]
  };
};
},{}],139:[function(require,module,exports){
module.exports = function(hljs) {
  var BUILTIN_MODULES = 'ObjectLoader Animate MovieCredits Slides Filters Shading Materials LensFlare Mapping VLCAudioVideo StereoDecoder PointCloud NetworkAccess RemoteControl RegExp ChromaKey Snowfall NodeJS Speech Charts';

  var XL_KEYWORDS = {
    keyword: 'if then else do while until for loop import with is as where when by data constant',
    literal: 'true false nil',
    type: 'integer real text name boolean symbol infix prefix postfix block tree',
    built_in: 'in mod rem and or xor not abs sign floor ceil sqrt sin cos tan asin acos atan exp expm1 log log2 log10 log1p pi at',
    module: BUILTIN_MODULES,
    id: 'text_length text_range text_find text_replace contains page slide basic_slide title_slide title subtitle fade_in fade_out fade_at clear_color color line_color line_width texture_wrap texture_transform texture scale_?x scale_?y scale_?z? translate_?x translate_?y translate_?z? rotate_?x rotate_?y rotate_?z? rectangle circle ellipse sphere path line_to move_to quad_to curve_to theme background contents locally time mouse_?x mouse_?y mouse_buttons'
  };

  var XL_CONSTANT = {
    className: 'constant',
    begin: '[A-Z][A-Z_0-9]+',
    relevance: 0
  };
  var XL_VARIABLE = {
    className: 'variable',
    begin: '([A-Z][a-z_0-9]+)+',
    relevance: 0
  };
  var XL_ID = {
    className: 'id',
    begin: '[a-z][a-z_0-9]+',
    relevance: 0
  };

  var DOUBLE_QUOTE_TEXT = {
    className: 'string',
    begin: '"', end: '"', illegal: '\\n'
  };
  var SINGLE_QUOTE_TEXT = {
    className: 'string',
    begin: '\'', end: '\'', illegal: '\\n'
  };
  var LONG_TEXT = {
    className: 'string',
    begin: '<<', end: '>>'
  };
  var BASED_NUMBER = {
    className: 'number',
    begin: '[0-9]+#[0-9A-Z_]+(\\.[0-9-A-Z_]+)?#?([Ee][+-]?[0-9]+)?',
    relevance: 10
  };
  var IMPORT = {
    className: 'import',
    beginKeywords: 'import', end: '$',
    keywords: {
      keyword: 'import',
      module: BUILTIN_MODULES
    },
    relevance: 0,
    contains: [DOUBLE_QUOTE_TEXT]
  };
  var FUNCTION_DEFINITION = {
    className: 'function',
    begin: '[a-z].*->'
  };
  return {
    aliases: ['tao'],
    lexemes: /[a-zA-Z][a-zA-Z0-9_?]*/,
    keywords: XL_KEYWORDS,
    contains: [
    hljs.C_LINE_COMMENT_MODE,
    hljs.C_BLOCK_COMMENT_MODE,
    DOUBLE_QUOTE_TEXT,
    SINGLE_QUOTE_TEXT,
    LONG_TEXT,
    FUNCTION_DEFINITION,
    IMPORT,
    XL_CONSTANT,
    XL_VARIABLE,
    XL_ID,
    BASED_NUMBER,
    hljs.NUMBER_MODE
    ]
  };
};
},{}],140:[function(require,module,exports){
module.exports = function(hljs) {
  var XML_IDENT_RE = '[A-Za-z0-9\\._:-]+';
  var PHP = {
    begin: /<\?(php)?(?!\w)/, end: /\?>/,
    subLanguage: 'php', subLanguageMode: 'continuous'
  };
  var TAG_INTERNALS = {
    endsWithParent: true,
    illegal: /</,
    relevance: 0,
    contains: [
      PHP,
      {
        className: 'attribute',
        begin: XML_IDENT_RE,
        relevance: 0
      },
      {
        begin: '=',
        relevance: 0,
        contains: [
          {
            className: 'value',
            contains: [PHP],
            variants: [
              {begin: /"/, end: /"/},
              {begin: /'/, end: /'/},
              {begin: /[^\s\/>]+/}
            ]
          }
        ]
      }
    ]
  };
  return {
    aliases: ['html', 'xhtml', 'rss', 'atom', 'xsl', 'plist'],
    case_insensitive: true,
    contains: [
      {
        className: 'doctype',
        begin: '<!DOCTYPE', end: '>',
        relevance: 10,
        contains: [{begin: '\\[', end: '\\]'}]
      },
      hljs.COMMENT(
        '<!--',
        '-->',
        {
          relevance: 10
        }
      ),
      {
        className: 'cdata',
        begin: '<\\!\\[CDATA\\[', end: '\\]\\]>',
        relevance: 10
      },
      {
        className: 'tag',
        /*
        The lookahead pattern (?=...) ensures that 'begin' only matches
        '<style' as a single word, followed by a whitespace or an
        ending braket. The '$' is needed for the lexeme to be recognized
        by hljs.subMode() that tests lexemes outside the stream.
        */
        begin: '<style(?=\\s|>|$)', end: '>',
        keywords: {title: 'style'},
        contains: [TAG_INTERNALS],
        starts: {
          end: '</style>', returnEnd: true,
          subLanguage: 'css'
        }
      },
      {
        className: 'tag',
        // See the comment in the <style tag about the lookahead pattern
        begin: '<script(?=\\s|>|$)', end: '>',
        keywords: {title: 'script'},
        contains: [TAG_INTERNALS],
        starts: {
          end: '\<\/script\>', returnEnd: true,
          subLanguage: ''
        }
      },
      PHP,
      {
        className: 'pi',
        begin: /<\?\w+/, end: /\?>/,
        relevance: 10
      },
      {
        className: 'tag',
        begin: '</?', end: '/?>',
        contains: [
          {
            className: 'title', begin: /[^ \/><\n\t]+/, relevance: 0
          },
          TAG_INTERNALS
        ]
      }
    ]
  };
};
},{}],141:[function(require,module,exports){
(function (global){
/**
 * marked - a markdown parser
 * Copyright (c) 2011-2014, Christopher Jeffrey. (MIT Licensed)
 * https://github.com/chjj/marked
 */

;(function() {

/**
 * Block-Level Grammar
 */

var block = {
  newline: /^\n+/,
  code: /^( {4}[^\n]+\n*)+/,
  fences: noop,
  hr: /^( *[-*_]){3,} *(?:\n+|$)/,
  heading: /^ *(#{1,6}) *([^\n]+?) *#* *(?:\n+|$)/,
  nptable: noop,
  lheading: /^([^\n]+)\n *(=|-){2,} *(?:\n+|$)/,
  blockquote: /^( *>[^\n]+(\n(?!def)[^\n]+)*\n*)+/,
  list: /^( *)(bull) [\s\S]+?(?:hr|def|\n{2,}(?! )(?!\1bull )\n*|\s*$)/,
  html: /^ *(?:comment *(?:\n|\s*$)|closed *(?:\n{2,}|\s*$)|closing *(?:\n{2,}|\s*$))/,
  def: /^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$)/,
  table: noop,
  paragraph: /^((?:[^\n]+\n?(?!hr|heading|lheading|blockquote|tag|def))+)\n*/,
  text: /^[^\n]+/
};

block.bullet = /(?:[*+-]|\d+\.)/;
block.item = /^( *)(bull) [^\n]*(?:\n(?!\1bull )[^\n]*)*/;
block.item = replace(block.item, 'gm')
  (/bull/g, block.bullet)
  ();

block.list = replace(block.list)
  (/bull/g, block.bullet)
  ('hr', '\\n+(?=\\1?(?:[-*_] *){3,}(?:\\n+|$))')
  ('def', '\\n+(?=' + block.def.source + ')')
  ();

block.blockquote = replace(block.blockquote)
  ('def', block.def)
  ();

block._tag = '(?!(?:'
  + 'a|em|strong|small|s|cite|q|dfn|abbr|data|time|code'
  + '|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo'
  + '|span|br|wbr|ins|del|img)\\b)\\w+(?!:/|[^\\w\\s@]*@)\\b';

block.html = replace(block.html)
  ('comment', /<!--[\s\S]*?-->/)
  ('closed', /<(tag)[\s\S]+?<\/\1>/)
  ('closing', /<tag(?:"[^"]*"|'[^']*'|[^'">])*?>/)
  (/tag/g, block._tag)
  ();

block.paragraph = replace(block.paragraph)
  ('hr', block.hr)
  ('heading', block.heading)
  ('lheading', block.lheading)
  ('blockquote', block.blockquote)
  ('tag', '<' + block._tag)
  ('def', block.def)
  ();

/**
 * Normal Block Grammar
 */

block.normal = merge({}, block);

/**
 * GFM Block Grammar
 */

block.gfm = merge({}, block.normal, {
  fences: /^ *(`{3,}|~{3,}) *(\S+)? *\n([\s\S]+?)\s*\1 *(?:\n+|$)/,
  paragraph: /^/
});

block.gfm.paragraph = replace(block.paragraph)
  ('(?!', '(?!'
    + block.gfm.fences.source.replace('\\1', '\\2') + '|'
    + block.list.source.replace('\\1', '\\3') + '|')
  ();

/**
 * GFM + Tables Block Grammar
 */

block.tables = merge({}, block.gfm, {
  nptable: /^ *(\S.*\|.*)\n *([-:]+ *\|[-| :]*)\n((?:.*\|.*(?:\n|$))*)\n*/,
  table: /^ *\|(.+)\n *\|( *[-:]+[-| :]*)\n((?: *\|.*(?:\n|$))*)\n*/
});

/**
 * Block Lexer
 */

function Lexer(options) {
  this.tokens = [];
  this.tokens.links = {};
  this.options = options || marked.defaults;
  this.rules = block.normal;

  if (this.options.gfm) {
    if (this.options.tables) {
      this.rules = block.tables;
    } else {
      this.rules = block.gfm;
    }
  }
}

/**
 * Expose Block Rules
 */

Lexer.rules = block;

/**
 * Static Lex Method
 */

Lexer.lex = function(src, options) {
  var lexer = new Lexer(options);
  return lexer.lex(src);
};

/**
 * Preprocessing
 */

Lexer.prototype.lex = function(src) {
  src = src
    .replace(/\r\n|\r/g, '\n')
    .replace(/\t/g, '    ')
    .replace(/\u00a0/g, ' ')
    .replace(/\u2424/g, '\n');

  return this.token(src, true);
};

/**
 * Lexing
 */

Lexer.prototype.token = function(src, top, bq) {
  var src = src.replace(/^ +$/gm, '')
    , next
    , loose
    , cap
    , bull
    , b
    , item
    , space
    , i
    , l;

  while (src) {
    // newline
    if (cap = this.rules.newline.exec(src)) {
      src = src.substring(cap[0].length);
      if (cap[0].length > 1) {
        this.tokens.push({
          type: 'space'
        });
      }
    }

    // code
    if (cap = this.rules.code.exec(src)) {
      src = src.substring(cap[0].length);
      cap = cap[0].replace(/^ {4}/gm, '');
      this.tokens.push({
        type: 'code',
        text: !this.options.pedantic
          ? cap.replace(/\n+$/, '')
          : cap
      });
      continue;
    }

    // fences (gfm)
    if (cap = this.rules.fences.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'code',
        lang: cap[2],
        text: cap[3]
      });
      continue;
    }

    // heading
    if (cap = this.rules.heading.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'heading',
        depth: cap[1].length,
        text: cap[2]
      });
      continue;
    }

    // table no leading pipe (gfm)
    if (top && (cap = this.rules.nptable.exec(src))) {
      src = src.substring(cap[0].length);

      item = {
        type: 'table',
        header: cap[1].replace(/^ *| *\| *$/g, '').split(/ *\| */),
        align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
        cells: cap[3].replace(/\n$/, '').split('\n')
      };

      for (i = 0; i < item.align.length; i++) {
        if (/^ *-+: *$/.test(item.align[i])) {
          item.align[i] = 'right';
        } else if (/^ *:-+: *$/.test(item.align[i])) {
          item.align[i] = 'center';
        } else if (/^ *:-+ *$/.test(item.align[i])) {
          item.align[i] = 'left';
        } else {
          item.align[i] = null;
        }
      }

      for (i = 0; i < item.cells.length; i++) {
        item.cells[i] = item.cells[i].split(/ *\| */);
      }

      this.tokens.push(item);

      continue;
    }

    // lheading
    if (cap = this.rules.lheading.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'heading',
        depth: cap[2] === '=' ? 1 : 2,
        text: cap[1]
      });
      continue;
    }

    // hr
    if (cap = this.rules.hr.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'hr'
      });
      continue;
    }

    // blockquote
    if (cap = this.rules.blockquote.exec(src)) {
      src = src.substring(cap[0].length);

      this.tokens.push({
        type: 'blockquote_start'
      });

      cap = cap[0].replace(/^ *> ?/gm, '');

      // Pass `top` to keep the current
      // "toplevel" state. This is exactly
      // how markdown.pl works.
      this.token(cap, top, true);

      this.tokens.push({
        type: 'blockquote_end'
      });

      continue;
    }

    // list
    if (cap = this.rules.list.exec(src)) {
      src = src.substring(cap[0].length);
      bull = cap[2];

      this.tokens.push({
        type: 'list_start',
        ordered: bull.length > 1
      });

      // Get each top-level item.
      cap = cap[0].match(this.rules.item);

      next = false;
      l = cap.length;
      i = 0;

      for (; i < l; i++) {
        item = cap[i];

        // Remove the list item's bullet
        // so it is seen as the next token.
        space = item.length;
        item = item.replace(/^ *([*+-]|\d+\.) +/, '');

        // Outdent whatever the
        // list item contains. Hacky.
        if (~item.indexOf('\n ')) {
          space -= item.length;
          item = !this.options.pedantic
            ? item.replace(new RegExp('^ {1,' + space + '}', 'gm'), '')
            : item.replace(/^ {1,4}/gm, '');
        }

        // Determine whether the next list item belongs here.
        // Backpedal if it does not belong in this list.
        if (this.options.smartLists && i !== l - 1) {
          b = block.bullet.exec(cap[i + 1])[0];
          if (bull !== b && !(bull.length > 1 && b.length > 1)) {
            src = cap.slice(i + 1).join('\n') + src;
            i = l - 1;
          }
        }

        // Determine whether item is loose or not.
        // Use: /(^|\n)(?! )[^\n]+\n\n(?!\s*$)/
        // for discount behavior.
        loose = next || /\n\n(?!\s*$)/.test(item);
        if (i !== l - 1) {
          next = item.charAt(item.length - 1) === '\n';
          if (!loose) loose = next;
        }

        this.tokens.push({
          type: loose
            ? 'loose_item_start'
            : 'list_item_start'
        });

        // Recurse.
        this.token(item, false, bq);

        this.tokens.push({
          type: 'list_item_end'
        });
      }

      this.tokens.push({
        type: 'list_end'
      });

      continue;
    }

    // html
    if (cap = this.rules.html.exec(src)) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: this.options.sanitize
          ? 'paragraph'
          : 'html',
        pre: cap[1] === 'pre' || cap[1] === 'script' || cap[1] === 'style',
        text: cap[0]
      });
      continue;
    }

    // def
    if ((!bq && top) && (cap = this.rules.def.exec(src))) {
      src = src.substring(cap[0].length);
      this.tokens.links[cap[1].toLowerCase()] = {
        href: cap[2],
        title: cap[3]
      };
      continue;
    }

    // table (gfm)
    if (top && (cap = this.rules.table.exec(src))) {
      src = src.substring(cap[0].length);

      item = {
        type: 'table',
        header: cap[1].replace(/^ *| *\| *$/g, '').split(/ *\| */),
        align: cap[2].replace(/^ *|\| *$/g, '').split(/ *\| */),
        cells: cap[3].replace(/(?: *\| *)?\n$/, '').split('\n')
      };

      for (i = 0; i < item.align.length; i++) {
        if (/^ *-+: *$/.test(item.align[i])) {
          item.align[i] = 'right';
        } else if (/^ *:-+: *$/.test(item.align[i])) {
          item.align[i] = 'center';
        } else if (/^ *:-+ *$/.test(item.align[i])) {
          item.align[i] = 'left';
        } else {
          item.align[i] = null;
        }
      }

      for (i = 0; i < item.cells.length; i++) {
        item.cells[i] = item.cells[i]
          .replace(/^ *\| *| *\| *$/g, '')
          .split(/ *\| */);
      }

      this.tokens.push(item);

      continue;
    }

    // top-level paragraph
    if (top && (cap = this.rules.paragraph.exec(src))) {
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'paragraph',
        text: cap[1].charAt(cap[1].length - 1) === '\n'
          ? cap[1].slice(0, -1)
          : cap[1]
      });
      continue;
    }

    // text
    if (cap = this.rules.text.exec(src)) {
      // Top-level should never reach here.
      src = src.substring(cap[0].length);
      this.tokens.push({
        type: 'text',
        text: cap[0]
      });
      continue;
    }

    if (src) {
      throw new
        Error('Infinite loop on byte: ' + src.charCodeAt(0));
    }
  }

  return this.tokens;
};

/**
 * Inline-Level Grammar
 */

var inline = {
  escape: /^\\([\\`*{}\[\]()#+\-.!_>])/,
  autolink: /^<([^ >]+(@|:\/)[^ >]+)>/,
  url: noop,
  tag: /^<!--[\s\S]*?-->|^<\/?\w+(?:"[^"]*"|'[^']*'|[^'">])*?>/,
  link: /^!?\[(inside)\]\(href\)/,
  reflink: /^!?\[(inside)\]\s*\[([^\]]*)\]/,
  nolink: /^!?\[((?:\[[^\]]*\]|[^\[\]])*)\]/,
  strong: /^__([\s\S]+?)__(?!_)|^\*\*([\s\S]+?)\*\*(?!\*)/,
  em: /^\b_((?:__|[\s\S])+?)_\b|^\*((?:\*\*|[\s\S])+?)\*(?!\*)/,
  code: /^(`+)\s*([\s\S]*?[^`])\s*\1(?!`)/,
  br: /^ {2,}\n(?!\s*$)/,
  del: noop,
  text: /^[\s\S]+?(?=[\\<!\[_*`]| {2,}\n|$)/
};

inline._inside = /(?:\[[^\]]*\]|[^\[\]]|\](?=[^\[]*\]))*/;
inline._href = /\s*<?([\s\S]*?)>?(?:\s+['"]([\s\S]*?)['"])?\s*/;

inline.link = replace(inline.link)
  ('inside', inline._inside)
  ('href', inline._href)
  ();

inline.reflink = replace(inline.reflink)
  ('inside', inline._inside)
  ();

/**
 * Normal Inline Grammar
 */

inline.normal = merge({}, inline);

/**
 * Pedantic Inline Grammar
 */

inline.pedantic = merge({}, inline.normal, {
  strong: /^__(?=\S)([\s\S]*?\S)__(?!_)|^\*\*(?=\S)([\s\S]*?\S)\*\*(?!\*)/,
  em: /^_(?=\S)([\s\S]*?\S)_(?!_)|^\*(?=\S)([\s\S]*?\S)\*(?!\*)/
});

/**
 * GFM Inline Grammar
 */

inline.gfm = merge({}, inline.normal, {
  escape: replace(inline.escape)('])', '~|])')(),
  url: /^(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/,
  del: /^~~(?=\S)([\s\S]*?\S)~~/,
  text: replace(inline.text)
    (']|', '~]|')
    ('|', '|https?://|')
    ()
});

/**
 * GFM + Line Breaks Inline Grammar
 */

inline.breaks = merge({}, inline.gfm, {
  br: replace(inline.br)('{2,}', '*')(),
  text: replace(inline.gfm.text)('{2,}', '*')()
});

/**
 * Inline Lexer & Compiler
 */

function InlineLexer(links, options) {
  this.options = options || marked.defaults;
  this.links = links;
  this.rules = inline.normal;
  this.renderer = this.options.renderer || new Renderer;
  this.renderer.options = this.options;

  if (!this.links) {
    throw new
      Error('Tokens array requires a `links` property.');
  }

  if (this.options.gfm) {
    if (this.options.breaks) {
      this.rules = inline.breaks;
    } else {
      this.rules = inline.gfm;
    }
  } else if (this.options.pedantic) {
    this.rules = inline.pedantic;
  }
}

/**
 * Expose Inline Rules
 */

InlineLexer.rules = inline;

/**
 * Static Lexing/Compiling Method
 */

InlineLexer.output = function(src, links, options) {
  var inline = new InlineLexer(links, options);
  return inline.output(src);
};

/**
 * Lexing/Compiling
 */

InlineLexer.prototype.output = function(src) {
  var out = ''
    , link
    , text
    , href
    , cap;

  while (src) {
    // escape
    if (cap = this.rules.escape.exec(src)) {
      src = src.substring(cap[0].length);
      out += cap[1];
      continue;
    }

    // autolink
    if (cap = this.rules.autolink.exec(src)) {
      src = src.substring(cap[0].length);
      if (cap[2] === '@') {
        text = cap[1].charAt(6) === ':'
          ? this.mangle(cap[1].substring(7))
          : this.mangle(cap[1]);
        href = this.mangle('mailto:') + text;
      } else {
        text = escape(cap[1]);
        href = text;
      }
      out += this.renderer.link(href, null, text);
      continue;
    }

    // url (gfm)
    if (!this.inLink && (cap = this.rules.url.exec(src))) {
      src = src.substring(cap[0].length);
      text = escape(cap[1]);
      href = text;
      out += this.renderer.link(href, null, text);
      continue;
    }

    // tag
    if (cap = this.rules.tag.exec(src)) {
      if (!this.inLink && /^<a /i.test(cap[0])) {
        this.inLink = true;
      } else if (this.inLink && /^<\/a>/i.test(cap[0])) {
        this.inLink = false;
      }
      src = src.substring(cap[0].length);
      out += this.options.sanitize
        ? escape(cap[0])
        : cap[0];
      continue;
    }

    // link
    if (cap = this.rules.link.exec(src)) {
      src = src.substring(cap[0].length);
      this.inLink = true;
      out += this.outputLink(cap, {
        href: cap[2],
        title: cap[3]
      });
      this.inLink = false;
      continue;
    }

    // reflink, nolink
    if ((cap = this.rules.reflink.exec(src))
        || (cap = this.rules.nolink.exec(src))) {
      src = src.substring(cap[0].length);
      link = (cap[2] || cap[1]).replace(/\s+/g, ' ');
      link = this.links[link.toLowerCase()];
      if (!link || !link.href) {
        out += cap[0].charAt(0);
        src = cap[0].substring(1) + src;
        continue;
      }
      this.inLink = true;
      out += this.outputLink(cap, link);
      this.inLink = false;
      continue;
    }

    // strong
    if (cap = this.rules.strong.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.strong(this.output(cap[2] || cap[1]));
      continue;
    }

    // em
    if (cap = this.rules.em.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.em(this.output(cap[2] || cap[1]));
      continue;
    }

    // code
    if (cap = this.rules.code.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.codespan(escape(cap[2], true));
      continue;
    }

    // br
    if (cap = this.rules.br.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.br();
      continue;
    }

    // del (gfm)
    if (cap = this.rules.del.exec(src)) {
      src = src.substring(cap[0].length);
      out += this.renderer.del(this.output(cap[1]));
      continue;
    }

    // text
    if (cap = this.rules.text.exec(src)) {
      src = src.substring(cap[0].length);
      out += escape(this.smartypants(cap[0]));
      continue;
    }

    if (src) {
      throw new
        Error('Infinite loop on byte: ' + src.charCodeAt(0));
    }
  }

  return out;
};

/**
 * Compile Link
 */

InlineLexer.prototype.outputLink = function(cap, link) {
  var href = escape(link.href)
    , title = link.title ? escape(link.title) : null;

  return cap[0].charAt(0) !== '!'
    ? this.renderer.link(href, title, this.output(cap[1]))
    : this.renderer.image(href, title, escape(cap[1]));
};

/**
 * Smartypants Transformations
 */

InlineLexer.prototype.smartypants = function(text) {
  if (!this.options.smartypants) return text;
  return text
    // em-dashes
    .replace(/--/g, '\u2014')
    // opening singles
    .replace(/(^|[-\u2014/(\[{"\s])'/g, '$1\u2018')
    // closing singles & apostrophes
    .replace(/'/g, '\u2019')
    // opening doubles
    .replace(/(^|[-\u2014/(\[{\u2018\s])"/g, '$1\u201c')
    // closing doubles
    .replace(/"/g, '\u201d')
    // ellipses
    .replace(/\.{3}/g, '\u2026');
};

/**
 * Mangle Links
 */

InlineLexer.prototype.mangle = function(text) {
  var out = ''
    , l = text.length
    , i = 0
    , ch;

  for (; i < l; i++) {
    ch = text.charCodeAt(i);
    if (Math.random() > 0.5) {
      ch = 'x' + ch.toString(16);
    }
    out += '&#' + ch + ';';
  }

  return out;
};

/**
 * Renderer
 */

function Renderer(options) {
  this.options = options || {};
}

Renderer.prototype.code = function(code, lang, escaped) {
  if (this.options.highlight) {
    var out = this.options.highlight(code, lang);
    if (out != null && out !== code) {
      escaped = true;
      code = out;
    }
  }

  if (!lang) {
    return '<pre><code>'
      + (escaped ? code : escape(code, true))
      + '\n</code></pre>';
  }

  return '<pre><code class="'
    + this.options.langPrefix
    + escape(lang, true)
    + '">'
    + (escaped ? code : escape(code, true))
    + '\n</code></pre>\n';
};

Renderer.prototype.blockquote = function(quote) {
  return '<blockquote>\n' + quote + '</blockquote>\n';
};

Renderer.prototype.html = function(html) {
  return html;
};

Renderer.prototype.heading = function(text, level, raw) {
  return '<h'
    + level
    + ' id="'
    + this.options.headerPrefix
    + raw.toLowerCase().replace(/[^\w]+/g, '-')
    + '">'
    + text
    + '</h'
    + level
    + '>\n';
};

Renderer.prototype.hr = function() {
  return this.options.xhtml ? '<hr/>\n' : '<hr>\n';
};

Renderer.prototype.list = function(body, ordered) {
  var type = ordered ? 'ol' : 'ul';
  return '<' + type + '>\n' + body + '</' + type + '>\n';
};

Renderer.prototype.listitem = function(text) {
  return '<li>' + text + '</li>\n';
};

Renderer.prototype.paragraph = function(text) {
  return '<p>' + text + '</p>\n';
};

Renderer.prototype.table = function(header, body) {
  return '<table>\n'
    + '<thead>\n'
    + header
    + '</thead>\n'
    + '<tbody>\n'
    + body
    + '</tbody>\n'
    + '</table>\n';
};

Renderer.prototype.tablerow = function(content) {
  return '<tr>\n' + content + '</tr>\n';
};

Renderer.prototype.tablecell = function(content, flags) {
  var type = flags.header ? 'th' : 'td';
  var tag = flags.align
    ? '<' + type + ' style="text-align:' + flags.align + '">'
    : '<' + type + '>';
  return tag + content + '</' + type + '>\n';
};

// span level renderer
Renderer.prototype.strong = function(text) {
  return '<strong>' + text + '</strong>';
};

Renderer.prototype.em = function(text) {
  return '<em>' + text + '</em>';
};

Renderer.prototype.codespan = function(text) {
  return '<code>' + text + '</code>';
};

Renderer.prototype.br = function() {
  return this.options.xhtml ? '<br/>' : '<br>';
};

Renderer.prototype.del = function(text) {
  return '<del>' + text + '</del>';
};

Renderer.prototype.link = function(href, title, text) {
  if (this.options.sanitize) {
    try {
      var prot = decodeURIComponent(unescape(href))
        .replace(/[^\w:]/g, '')
        .toLowerCase();
    } catch (e) {
      return '';
    }
    if (prot.indexOf('javascript:') === 0 || prot.indexOf('vbscript:') === 0) {
      return '';
    }
  }
  var out = '<a href="' + href + '"';
  if (title) {
    out += ' title="' + title + '"';
  }
  out += '>' + text + '</a>';
  return out;
};

Renderer.prototype.image = function(href, title, text) {
  var out = '<img src="' + href + '" alt="' + text + '"';
  if (title) {
    out += ' title="' + title + '"';
  }
  out += this.options.xhtml ? '/>' : '>';
  return out;
};

/**
 * Parsing & Compiling
 */

function Parser(options) {
  this.tokens = [];
  this.token = null;
  this.options = options || marked.defaults;
  this.options.renderer = this.options.renderer || new Renderer;
  this.renderer = this.options.renderer;
  this.renderer.options = this.options;
}

/**
 * Static Parse Method
 */

Parser.parse = function(src, options, renderer) {
  var parser = new Parser(options, renderer);
  return parser.parse(src);
};

/**
 * Parse Loop
 */

Parser.prototype.parse = function(src) {
  this.inline = new InlineLexer(src.links, this.options, this.renderer);
  this.tokens = src.reverse();

  var out = '';
  while (this.next()) {
    out += this.tok();
  }

  return out;
};

/**
 * Next Token
 */

Parser.prototype.next = function() {
  return this.token = this.tokens.pop();
};

/**
 * Preview Next Token
 */

Parser.prototype.peek = function() {
  return this.tokens[this.tokens.length - 1] || 0;
};

/**
 * Parse Text Tokens
 */

Parser.prototype.parseText = function() {
  var body = this.token.text;

  while (this.peek().type === 'text') {
    body += '\n' + this.next().text;
  }

  return this.inline.output(body);
};

/**
 * Parse Current Token
 */

Parser.prototype.tok = function() {
  switch (this.token.type) {
    case 'space': {
      return '';
    }
    case 'hr': {
      return this.renderer.hr();
    }
    case 'heading': {
      return this.renderer.heading(
        this.inline.output(this.token.text),
        this.token.depth,
        this.token.text);
    }
    case 'code': {
      return this.renderer.code(this.token.text,
        this.token.lang,
        this.token.escaped);
    }
    case 'table': {
      var header = ''
        , body = ''
        , i
        , row
        , cell
        , flags
        , j;

      // header
      cell = '';
      for (i = 0; i < this.token.header.length; i++) {
        flags = { header: true, align: this.token.align[i] };
        cell += this.renderer.tablecell(
          this.inline.output(this.token.header[i]),
          { header: true, align: this.token.align[i] }
        );
      }
      header += this.renderer.tablerow(cell);

      for (i = 0; i < this.token.cells.length; i++) {
        row = this.token.cells[i];

        cell = '';
        for (j = 0; j < row.length; j++) {
          cell += this.renderer.tablecell(
            this.inline.output(row[j]),
            { header: false, align: this.token.align[j] }
          );
        }

        body += this.renderer.tablerow(cell);
      }
      return this.renderer.table(header, body);
    }
    case 'blockquote_start': {
      var body = '';

      while (this.next().type !== 'blockquote_end') {
        body += this.tok();
      }

      return this.renderer.blockquote(body);
    }
    case 'list_start': {
      var body = ''
        , ordered = this.token.ordered;

      while (this.next().type !== 'list_end') {
        body += this.tok();
      }

      return this.renderer.list(body, ordered);
    }
    case 'list_item_start': {
      var body = '';

      while (this.next().type !== 'list_item_end') {
        body += this.token.type === 'text'
          ? this.parseText()
          : this.tok();
      }

      return this.renderer.listitem(body);
    }
    case 'loose_item_start': {
      var body = '';

      while (this.next().type !== 'list_item_end') {
        body += this.tok();
      }

      return this.renderer.listitem(body);
    }
    case 'html': {
      var html = !this.token.pre && !this.options.pedantic
        ? this.inline.output(this.token.text)
        : this.token.text;
      return this.renderer.html(html);
    }
    case 'paragraph': {
      return this.renderer.paragraph(this.inline.output(this.token.text));
    }
    case 'text': {
      return this.renderer.paragraph(this.parseText());
    }
  }
};

/**
 * Helpers
 */

function escape(html, encode) {
  return html
    .replace(!encode ? /&(?!#?\w+;)/g : /&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function unescape(html) {
  return html.replace(/&([#\w]+);/g, function(_, n) {
    n = n.toLowerCase();
    if (n === 'colon') return ':';
    if (n.charAt(0) === '#') {
      return n.charAt(1) === 'x'
        ? String.fromCharCode(parseInt(n.substring(2), 16))
        : String.fromCharCode(+n.substring(1));
    }
    return '';
  });
}

function replace(regex, opt) {
  regex = regex.source;
  opt = opt || '';
  return function self(name, val) {
    if (!name) return new RegExp(regex, opt);
    val = val.source || val;
    val = val.replace(/(^|[^\[])\^/g, '$1');
    regex = regex.replace(name, val);
    return self;
  };
}

function noop() {}
noop.exec = noop;

function merge(obj) {
  var i = 1
    , target
    , key;

  for (; i < arguments.length; i++) {
    target = arguments[i];
    for (key in target) {
      if (Object.prototype.hasOwnProperty.call(target, key)) {
        obj[key] = target[key];
      }
    }
  }

  return obj;
}


/**
 * Marked
 */

function marked(src, opt, callback) {
  if (callback || typeof opt === 'function') {
    if (!callback) {
      callback = opt;
      opt = null;
    }

    opt = merge({}, marked.defaults, opt || {});

    var highlight = opt.highlight
      , tokens
      , pending
      , i = 0;

    try {
      tokens = Lexer.lex(src, opt)
    } catch (e) {
      return callback(e);
    }

    pending = tokens.length;

    var done = function(err) {
      if (err) {
        opt.highlight = highlight;
        return callback(err);
      }

      var out;

      try {
        out = Parser.parse(tokens, opt);
      } catch (e) {
        err = e;
      }

      opt.highlight = highlight;

      return err
        ? callback(err)
        : callback(null, out);
    };

    if (!highlight || highlight.length < 3) {
      return done();
    }

    delete opt.highlight;

    if (!pending) return done();

    for (; i < tokens.length; i++) {
      (function(token) {
        if (token.type !== 'code') {
          return --pending || done();
        }
        return highlight(token.text, token.lang, function(err, code) {
          if (err) return done(err);
          if (code == null || code === token.text) {
            return --pending || done();
          }
          token.text = code;
          token.escaped = true;
          --pending || done();
        });
      })(tokens[i]);
    }

    return;
  }
  try {
    if (opt) opt = merge({}, marked.defaults, opt);
    return Parser.parse(Lexer.lex(src, opt), opt);
  } catch (e) {
    e.message += '\nPlease report this to https://github.com/chjj/marked.';
    if ((opt || marked.defaults).silent) {
      return '<p>An error occured:</p><pre>'
        + escape(e.message + '', true)
        + '</pre>';
    }
    throw e;
  }
}

/**
 * Options
 */

marked.options =
marked.setOptions = function(opt) {
  merge(marked.defaults, opt);
  return marked;
};

marked.defaults = {
  gfm: true,
  tables: true,
  breaks: false,
  pedantic: false,
  sanitize: false,
  smartLists: false,
  silent: false,
  highlight: null,
  langPrefix: 'lang-',
  smartypants: false,
  headerPrefix: '',
  renderer: new Renderer,
  xhtml: false
};

/**
 * Expose
 */

marked.Parser = Parser;
marked.parser = Parser.parse;

marked.Renderer = Renderer;

marked.Lexer = Lexer;
marked.lexer = Lexer.lex;

marked.InlineLexer = InlineLexer;
marked.inlineLexer = InlineLexer.output;

marked.parse = marked;

if (typeof module !== 'undefined' && typeof exports === 'object') {
  module.exports = marked;
} else if (typeof define === 'function' && define.amd) {
  define(function() { return marked; });
} else {
  this.marked = marked;
}

}).call(function() {
  return this || (typeof window !== 'undefined' ? window : global);
}());

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}]},{},[1])(1)
});