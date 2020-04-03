#!/usr/bin/env python
# Compiler/decompiler for th06/th07/th08/th09 .end files
#
# Copyright (c) 2018 by Egor.
#
# This is free and unencumbered software released into the public domain.
#
# Anyone is free to copy, modify, publish, use, compile, sell, or
# distribute this software, either in source code form or as a compiled
# binary, for any purpose, commercial or non-commercial, and by any
# means.
#
# In jurisdictions that recognize copyright laws, the author or authors
# of this software dedicate any and all copyright interest in the
# software to the public domain. We make this dedication for the benefit
# of the public at large and to the detriment of our heirs and
# successors. We intend this dedication to be an overt act of
# relinquishment in perpetuity of all present and future rights to this
# software under copyright law.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
# EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
# MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
# IN NO EVENT SHALL THE AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR
# OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
# ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
# OTHER DEALINGS IN THE SOFTWARE.
#
# For more information, please refer to <http://unlicense.org/>

import sys;
import argparse;
import io;
import string;

def splitonws(s):
    i = 0
    while i<len(s):
        if(s[i].isspace()):
            break
        i += 1
    return s[:i], s[i:]

class StringFormatter:
    @staticmethod
    def tozun(arg):
        arg = arg.lstrip()
        if(arg[0] != '"'):
            raise Exception('string argument expected')
        s = io.StringIO()
        i = 1
        while(i < len(arg)):
            if(arg[i] == '"'):
                i += 1
                break
            elif(arg[i] == '\\'):
                i += 1
                s.write({
                        'a':'\a',
                        'b':'\b',
                        't':'\t',
                        'n':'\n',
                        'v':'\v',
                        'f':'\f',
                        'r':'\r',
                        '"':'"',
                        '\\':'\\',
                    }.get(arg[i], '\\'+arg[i]))
            else:
                s.write(arg[i])
            i += 1
        return s.getvalue(), arg[i:]
    @staticmethod
    def tosource(arg):
        pats = {
                '\a':'\\a',
                '\b':'\\b',
                '\t':'\\t',
                '\n':'\\n',
                '\v':'\\v',
                '\f':'\\f',
                '\r':'\\r',
                '\"':'\\"',
        }
        arg = arg.replace('\\','\\\\')
        for k,v in pats.items():
            arg = arg.replace(k,v)
        return '"'+arg+'"'

class IntegerFormatter:
    @staticmethod
    def tozun(arg):
        arg = arg.lstrip()
        arg, narg = splitonws(arg)
        return str(int(arg)), narg
    @staticmethod
    def tosource(arg):
        return str(int(arg))

class RGBFormatter:
    @staticmethod
    def tozun(arg):
        arg = arg.lstrip()
        arg, narg = splitonws(arg)
        if(len(arg) != 7 or arg[0] != '#'):
            raise Exception('expected #RRGGBB style string')
        return str((int(arg[1:3],16)) | (int(arg[3:5],16)<<8) | (int(arg[5:7],16)<<16)), narg
    @staticmethod
    def tosource(arg):
        col = int(arg)
        return '#{:02x}{:02x}{:02x}'.format(col&0xFF, (col>>8)&0xFF, (col>>16)&0xFF)

formatters = {
    's': StringFormatter,
    'i': IntegerFormatter,
    'c': RGBFormatter
}

class OpDef:
    def __init__(self, op, sname, signature):
        self.op = op
        self.sname = sname
        self.signature = signature
    def tozun(self, args):
        s = ''
        if self.op != '':
            s = '@'+self.op
        for i in range(len(self.signature)):
            f, args = formatters[self.signature[i]].tozun(args)
            s += f + '\0'
        return s
    def tosource(self, args):
        s = self.sname;
        for i in range(len(self.signature)):
            s +=' '+formatters[self.signature[i]].tosource(args[i])
        return s
ops = [
    OpDef('', 'display', 's'),
    OpDef('2', 'fadein', 'i'),
    OpDef('3', 'fadeout', 'i'),
    OpDef('a', 'anm', 'iii'), 
    OpDef('b', 'background', 's'),
    OpDef('c', 'color', 'c'),
    OpDef('F', 'exec', 's'),
    OpDef('M', 'musicfade', 'i'),
    OpDef('m', 'musicplay', 's'),
    OpDef('R', 'staffroll', 's'),
    OpDef('r', 'waitreset', 'ii'),
    OpDef('s', 'setdelay', 'ii'),
    OpDef('V', 'scrollbg', 'ii'),
    OpDef('v', 'setscroll', 'i'),
    OpDef('w', 'wait', 'ii'),
    OpDef('z', 'end', ''),
]
def opzun(op, argc):
    for od in ops:
        if od.op == op:
            #if argc != len(od.signature):
            #    raise Exception("invalid argument count!! op="+op+" argc="+str(argc))
            return od
    raise Exception("unknown op: op="+op+" argc="+str(argc))

def opsource(sname):
    for od in ops:
        if od.sname == sname:
            return od
    raise Exception("unknown instruction: "+sname)

parser = argparse.ArgumentParser(description='Compile/decompile th06 end files')
parser.add_argument('filename', help='.end file')
parser.add_argument('-j', action='store_const', const='shiftjis', default='utf-8', help='use sjis for .end files')
parser.add_argument('-c', action='store_true', help='compile instead of decompiling')
args = parser.parse_args()
if(not args.c):
    with open(args.filename, 'r', encoding=args.j, newline='\n') as f:
        for line in f:
            line = line.rstrip('\n')
            if(line.startswith('@')):
                op = line[1];
                line = line[2:]
            else:
                op = ''
            args = line.split('\0')[:-1]
            od = opzun(op,len(args))
            sys.stdout.write(od.tosource(args)+'\n')
else:
    with open(args.filename, 'w', encoding=args.j, newline='\n') as f:
        for line in sys.stdin:
            line = line.rstrip('\n')
            sname, sarg = splitonws(line)
            od = opsource(sname)
            f.write(od.tozun(sarg)+'\n')
