"use strict";
var splitonws = (s) => {
	var idx = s.search(/\s/);
	if(idx == -1) {
		return [s,''];
	}
	else {
		return [s.substring(0,idx), s.substring(idx)];
	}
};
var ltrim = (s) => s.replace(/^\s+/,'');
var formatters = {
	s:{
		tozun: (s) => {
			s = ltrim(s);
			if(s[0] != '"')
				throw new Error('string argument expected, got: '+s);
			var buf = '';
			var i = 1;
			while(i < s.length) {
				if(s[i] == '"') {
					++i;
					break;
				}
				else if(s[i] == '\\') {
					++i;
					var c = {
						'\\':'\\',
						'a':'\x07',
						'b':'\b',
						't':'\t',
						'n':'\n',
						'v':'\v',
						'f':'\f',
						'r':'\r',
						'"':'\"',
					}[s[i]];
					buf += c === undefined ? '\\'+s[i] : c;
				}
				else {
					buf += s[i];
				}
				++i;
			}
			return [buf, s.substring(i)];
		},
		tosource: (s) => {
			[
				[new RegExp('\\\\/','g'),'\\\\'],
				[new RegExp('\x07','g'),'\\a'],
				[new RegExp('\b','g'),'\\b'],
				[new RegExp('\t','g'),'\\t'],
				[new RegExp('\n','g'),'\\n'],
				[new RegExp('\v','g'),'\\v'],
				[new RegExp('\f','g'),'\\f'],
				[new RegExp('\r','g'),'\\r'],
				[new RegExp('\"','g'),'\\"'],
			].forEach((v) => {
				s=s.replace(v[0], v[1]);
			});
			return '"'+s+'"';
		},
	},
	i:{
		tozun: (s) => {
			var arr = splitonws(ltrim(s));
			return [String(parseInt(arr[0])),arr[1]];
		},
		tosource: (s) => String(parseInt(s)),
	},
	c:{
		tozun: (s) => {
			var arg = splitonws(ltrim(s))
			if(arg[0].length != 7 || arg[0][0] != '#')
				throw new Error("expected #RRGGBB style string, got: " +arg[0]);
			return [String((parseInt(arg[0].substring(1,3),16)) | (parseInt(arg[0].substring(3,5),16)<<8) | (parseInt(arg[0].substring(5,7),16)<<16)), arg[1]];
		},
		tosource: (s) => {
			var col = parseInt(s);
			return '#' + (col&0xFF).toString(16) + ((col>>8)&0xFF).toString(16) + ((col>>16)&0xFF).toString(16);
		},
	},
};
var ops = [
	['', 'display', 's'],
	['b', 'background', 's'],
	['a', 'anm', 'iii'],
	['V', 'scrollbg', 'ii'],
	['v', 'setscroll', 'i'],
	['F', 'exec', 's'],
	['R', 'staffroll', 's'],
	['m', 'musicplay', 's'],
	['M', 'musicfade', 'i'],
	['s', 'setdelay', 'ii'],
	['c', 'color', 'c'],
	['r', 'waitreset', 'ii'],
	['w', 'wait', 'ii'],
	['0', 'fadeinblack', 'i'],
	['1', 'fadeoutblack', 'i'],
	['2', 'fadein', 'i'],
	['3', 'fadeout', 'i'],
	['z', 'end', ''],
];

var tozun = (op, args) => {
	var s = '';
	if(op[0] != '')
		s = '@'+op[0];
	for(var i=0;i<op[2].length;i++) {
		var a = formatters[op[2][i]].tozun(args);
		s += a[0] + '\0';
		args = a[1];
	}
	return s+'\n';
};
var tosource = (op, args) => {
	var s = op[1];
	for(var i=0;i<op[2].length;i++) {
		s += ' '+formatters[op[2][i]].tosource(args[i]);
	}
	return s+'\n';
};
var compile = (src, enc) => {
	var arr = src.split('\n');
	var s = '';
	for(var i=0;i<arr.length;i++) {
		var line = arr[i].trim();
		if(line === '') continue;
		var a = splitonws(line);
		var od = ops.find((f) => f[1] == a[0]);
		s += tozun(od,a[1]);
	}
	return nlsEncoding.get(enc).then((encoder) => encoder.encode(s));
};
var decompile = (ab, enc) => {
	var decoder = new TextDecoder(enc);
	var arr = decoder.decode(ab).split('\n');
	arr.pop();
	var s = '';
	
	var warned = false;
	for(var i=0;i<arr.length;i++) {
		var op = '';
		var line = arr[i];
		if(line[0] == '@') {
			op = line[1];
			line = line.substring(2);
		}
		var args = line.split('\0');
		args.pop();
		var od = ops.find((f) => f[0] == op);
		if(!warned && args.length > od[2].length) {
			alert('extra arguments detected.\n\nthis has no effect on the game, but you won\'t be able to recompile the file "bit-for-bit".\nMost likely you\'re decompiling th08 NDT english translation.');
			warned = true;
		}
		s += tosource(od,args);
	}
	return s;
};
var errshow = (err) => {
	console.log(err);
	alert(err.message);
};
var errwrap = (f) => (...args) => {
	try {
		f.apply(null,args);
	}
	catch(err) {
		errshow(err);
	}
};
var readxhrUnsafe = (url, output, enc) => {
	var xhr = new XMLHttpRequest();
	xhr.open("GET",url);
	xhr.responseType = "arraybuffer";
	xhr.onloadend = errwrap(() => {
		if(xhr.readyState == 4 && xhr.status == 200 && xhr.responseType == "arraybuffer") {
			output.value = decompile(xhr.response, enc);
		}
	});
	xhr.send();
};
window.readxhr = errwrap((url, output, enc) => {
	if(!url.match(new RegExp('^[a-z0-9]+/[a-z0-9]+/[a-z0-9]+\\.end$','i'))) {
		throw new Error("Unsafe url");
	}
	readxhrUnsafe("endfiles/"+url, output, enc);
});
window.readfile = errwrap((f, output, enc) => {
	var reader = new FileReader();
	reader.onload = () => {
		output.value = decompile(reader.result, enc.value);
	};
	reader.readAsArrayBuffer(f.files[0]);
});
var downloadFilename='filename.end';
window.writefile = errwrap((a, input, enc) => {
	a.download = downloadFilename;
	if(a.href && a.href != '') {
		URL.revokeObjectURL(a.href);
		a.innerText = '';
	}
	var files = filein.files;
	if(files.length > 0)
		a.download = files[0].name;

	compile(input.value,enc.value).then(errwrap((compiled) => {
		a.href = URL.createObjectURL(new Blob([compiled], {type:'application/octet-stream',endings:'transparent'}));
		a.innerText = 'download';
	}));
});
var games = {};
var spEndfiles = [];
window.patchSelected = errwrap((opt, output) => {
	if(opt.dataset.loadMore) {
		patchSelect.selectedIndex = 0;
		for(var opt2 of spEndfiles) {
			patchSelect.add(opt2, opt);
		}
		patchSelect.removeChild(opt);
	}
	if(opt.dataset.game !== undefined) {
		var game = games[opt.dataset.game];
		if(game) {
			patchSource.href = game.source;
			patchSource.innerHTML = "(source)";
			readxhr(opt.value, output, game.encoding);
		}
		else {
			throw new Error("Invalid url (no such lang/game)");
		}
	}
	else {
		patchSource.innerHTML = "";
		patchSource.href = "";
	}
});
var query = new URLSearchParams(window.location.search);
var loadMode = "";
if(query.has("loadWiki")) {
	loadMode = "loadWiki";
}
else if(query.has("load")) {
	loadMode = "loadLocal";
}
window.endfilesCallback = errwrap((obj) => {
	for(var game in obj) {
		games[game] = {
			source: obj[game].source,
			encoding: obj[game].encoding
		};
		for(var file of obj[game].files) {
			var opt = document.createElement("option");
			opt.value = opt.text = game+"/"+file;
			opt.dataset.game = game;
			if(game.startsWith("ja/")) {
				patchSelect.add(opt);
			}
			else {
				spEndfiles.push(opt);
			}
		}
	}
	var opt = document.createElement("option");
	opt.dataset.loadMore='yes';
	opt.text = 'Load static translations';
	patchSelect.add(opt);
	patchSelect.style.display = 'inline';
	if(loadMode == "loadLocal") {
		var loadstr = query.get("load");
		var split = loadstr.split("/");
		if(split.length == 3) {
			var game = split[0] + "/" + split[1];
			console.log({value:split,dataset:{game:game}});
			patchSelected({value:loadstr,dataset:{game:game}}, output);
		}
		else {
			throw new Error("Invalid url (should be lang/game/file.end)");
		}
	}
});
var loadWiki = errwrap((loadstr) => {
	if(loadstr=="") {
		return;
	}
	if(!loadstr.match(new RegExp('^lang_[a-z]+-th0[6-9]-[a-z0-9]+\\.end$','i'))) {
		throw new Error("Unsafe url");
	}
	downloadFilename = loadstr;
	var url = 'mwimage.php?file='+loadstr;
	console.log("loading from "+url);
	readxhrUnsafe(url, output, "utf-8");
});
if (loadMode == "loadWiki") {
	loadWiki(query.get("loadWiki"));
}
