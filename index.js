#!/usr/bin/env node

 "use strict";
var fs = require('fs'),
	path = require('path'), 
	Getopt = require('node-getopt'),
	clc = require('cli-color'),
	jf = require('jsonfile'),
	mp = require('./lib/utils'),
	pjson = require('./package.json');

var log = (function(){
	var error = clc.red.bold;
	var warn = clc.yellow;
	var notice = clc.blue;

	return{
		warn: function(msg){
			console.log(warn(msg));
		},
		info: function(msg){
			console.log(notice(msg));
		},
		error: function(msg){
			console.log(error(msg));
		}
	}
}());
var getopt = new Getopt([
      ['v','version','Release version'],
	  ['h' , 'help']
	]).bindHelp();	
// process.argv needs slice(2) for it starts with 'node' and 'script name'
// parseSystem is alias  of parse(process.argv.slice(2))
var opt = getopt.parseSystem();
//opt = getopt.parse(process.argv.slice(2));
getopt.setHelp(
  "Usage: markpost [OPTION]\n" +
  "An arcticle generator with markdown.\n" +
  "\n" +
  "markpost init [name], Create a new proyect.\n"+
  "markpost create , Publish a article.\n"+
  "------------------------------------\n"+
  "[[OPTIONS]]\n" +
  "\n" +
  "Installation: npm install markpost\n" 
);
if (opt.options.version){
	log.info("Version "+ pjson.version);
}else{
	if(opt.argv[0]==='create' ){
		mp.generate(opt, function (err){
			if (err){
				log.error(err);
			}
		});
	}else if (opt.argv[0]==='init' && typeof opt.argv[1]!== 'undefined'){
		mp.init(opt);
	}else{
		return console.log(getopt.getHelp()); 
	}
}