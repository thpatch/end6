"use strict";
(function(global) {
	function ANSIEncoder(table) {
		this._table = new DataView(table);
	};
	ANSIEncoder.prototype.encode = function(s) {
		var output = [];
		for(var i=0;i<s.length;i++) {
			var cp = s.charCodeAt(i);
			output.push(this._table.getUint8(cp));
		}
		return new Uint8Array(output);
	};
	//----------------------------------------
	function DBCSEncoder(table) {
		this._table = new DataView(table);
	};
	DBCSEncoder.prototype.encode = function(s) {
		var output = [];
		for(var i=0;i<s.length;i++) {
			var cp = s.charCodeAt(i);
			var b1 = this._table.getUint8(cp*2);
			var b2 = this._table.getUint8(cp*2+1);
			if(b1 !== 0) {
				output.push(b1);
			}
			output.push(b2);
		}
		return new Uint8Array(output);
	};
	//----------------------------------------
	var nls = {};
	function getOrInit(objname,makeobj) {
		if(nls[objname]) {
			return Promise.resolve(nls[objname]);
		}
		return makeobj().then((obj) => nls[objname] = obj);
	};
	var fetchEnc = (cp,clazz) =>
		getOrInit(cp, () =>
			fetch('nls/'+cp+'.nls')
			.then((x) => x.arrayBuffer())
			.then((x) => new clazz(x)));
	global.nlsEncoding = nls;
	global.nlsEncoding.get = encoding => {
		switch(encoding) {
			case 'utf-8':
				return getOrInit('utf8',() => Promise.resolve(new TextEncoder()));
			case 'ms932':
				return fetchEnc('c932', DBCSEncoder);
			case 'windows-1251':
				return fetchEnc('c1251', ANSIEncoder);
			case 'windows-1252':
				return fetchEnc('c1252', ANSIEncoder);
			default:
				return Promise.reject(new Error("Invalid encoding"));
		}
	};
	//----------------------------------------
})(this);
