var markposts = (function(){

	var fs = require('fs'),
		path = require('path'), 
		Getopt = require('node-getopt'),
		mm = require('marky-mark'),
		async = require('async'),
		clc = require('cli-color'),
		slugify = require('slugify'),
		jf = require('jsonfile'),
		moment = require('moment'),
		tagsTmp={},
		indexTmp=[],
		totalPost = [],
		config = {
			'folder':{
				'articles':'articles',
			 	'process': 'articles_process',
			 	'dist': {
			 			 'src':'_dist', 
			 			 'posts':'posts',
			 			 'tags':'tags'
			 			}
			 },
			'pagination': {
				'enable':true,
				'size': 20
			}, 'dateFormat': 'DD-MM-YYYY'
		};

	(function(){
	  if (typeof Object.defineProperty === 'function'){
	    try{Object.defineProperty(Array.prototype,'sortBy',{value:sb}); }catch(e){}
	  }
	  if (!Array.prototype.sortBy) Array.prototype.sortBy = sb;

	  function sb(f){
	  	var i;
	    for (i=this.length;i;){
	      var o = this[--i];
	      this[i] = [].concat(f.call(o,o,i),o);
	    }
	    this.sort(function(a,b){
	      for (var i=0,len=a.length;i<len;++i){
	        if (a[i]!=b[i]) return a[i]>b[i]?-1:1;
	      }
	      return 0;
	    });

	    for (i=this.length;i;){
	      this[--i]=this[i][this[i].length-1];
	    }
	    return this;
	  }
	})();
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
		};
	}());

	function isEmpty(obj) {
    	return Object.keys(obj).length === 0;
	}

	var setConfig = function(){
		config = jf.readFileSync(process.cwd()+'/', {throws:false})||{};
	};	
	var generateFiles = function(posts){
		async.each(posts,function(post, callback){	
			if (isEmpty(post.meta)){
				callback('Meta is required in file '+ post.filename + post.filenameExtension);
			}else{
				create_post(post, function(err){
					if (err) return callback('Error when generating the posts');

					create_tags(post, function(err){
						if (err) return callback('Error when generating the tags');
						callback();
					});
				});		
			}
		}, function(err){
			if (err){
				return log.error(err);
			}else{
				merge_tags(function(err){
					if (err) return callback('Error when merging the tags files');
					
					log.info('Tag files were created');
				});
			}
		});
	};

	var merge_tags = function(callback){
		var file, filePag,
			handlerFile = function (file, meta, type){
						fs.writeFile(file, JSON.stringify(meta), function (err) {
							if (err){
								err = new Error('Error when generating the file: '+file);
								return callback(err);	
							}else{
								log.info(type+' file ' + file + ' was created.');
							}
						});
					},
			findDate = function(o){ return new Date( o.dateISO ); };


		for (var key in tagsTmp) {
	      if (tagsTmp.hasOwnProperty(key)) {
	      	file = config.folder.dist.src+'/'+ config.folder.dist.tags+'/'+ key +'_all.json';
			var obj=jf.readFileSync(file, {throws:false})||{};
			for (var ky in obj){
				tagsTmp[key].push(obj[ky]);
			}
			tagsTmp[key].sortBy(findDate);
			handlerFile(file, tagsTmp[key],'Tag');

			if (config.pagination.enable === true){
				var paginas =1,i=0, meta = {};
				paginas = Math.ceil(tagsTmp[key].length / config.pagination.size );
				for(i;i<paginas;i+=1){
					meta.total_pages = paginas;
					meta.current_page = i+1;
					meta.content=tagsTmp[key].slice(i*config.pagination.size, i*config.pagination.size + config.pagination.size);
					filePag = config.folder.dist.src+'/'+ config.folder.dist.tags+'/'+ key +'_'+(i+1)+'.json';
					handlerFile(filePag, meta, 'Pagination ');
				}
			}

	      }
	    }//FOR

		var fileIndex =config.folder.dist.src+'/index.json';
	    
		var obj=jf.readFileSync(fileIndex, {throws:false})||{};
		for (var ky in obj){
			totalPost.push(obj[ky]);
		}
	    totalPost.sortBy(findDate);
		handlerFile(fileIndex, totalPost,'index');	

		if (config.pagination.enable === true){
			var paginas =1,i=0, meta = {};
			paginas = Math.ceil(totalPost.length / config.pagination.size );
			for(i;i<paginas;i+=1){
				meta.total_pages = paginas;
				meta.current_page = i+1;
				meta.content=totalPost.slice(i*config.pagination.size, i*config.pagination.size + config.pagination.size);
				filePag = config.folder.dist.src+'/index_'+(i+1)+'.json';
				handlerFile(filePag, meta, 'Pagination ');
			}
		}

	};

	var create_post = function(post, callback){
		var content = {};
		content.meta = post.meta;
		content.html = post.content;
		var name = config.folder.dist.src+'/'+config.folder.dist.posts+'/'+slugify(post.meta.title.toLowerCase())+'.json';
		fs.writeFile(name, JSON.stringify(content), function (err) {
			if (err){
				err = new Error('Error when generating the config file');
				return callback(err);	
			}else{
				log.info('Post ' + post.meta.title + ' was added.');
			}
			callback();
		});
	};

	var create_tags = function(post, callback){
		var tags = post.meta.tags,
			c;
		var name = config.folder.dist.posts+'/'+slugify(post.meta.title.toLowerCase());
			post.meta.url=name;
			post.meta.dateISO=moment(post.meta.date, config.dateFormat).format();
		totalPost.push(post.meta);
		async.each(tags, function(tag, callback) {
			c = tag.toLowerCase();
	        tagsTmp[c]=tagsTmp[c]||[];
	        tagsTmp[c].push(post.meta);	
		    callback();
		}, function(err){
		    if(err) {
		    	return callback(err);
		    } else {
		    	return callback();
		    }
		});
	};


	var createifnotexit = function (folder, callback){		
		fs.exists(folder, function (exists) {
			if(!exists){
				log.info('The directory ' + folder + ' was created.');
				fs.mkdir(folder,function(err){
					if (err) return callback(err);
				});	
			}else{
				log.info('The directory ' + folder + ' exist.');
			}
			return callback(null, 'OK');
		});
	};

	
	return {
		init : function(opt){
			var proyectPath = process.cwd()+'/'+opt.argv[1];
			fs.mkdir(proyectPath, function(err){
				if(err){
					err = new Error('Error when generating the Blog Base directory');
	          		log.error(err);
				}else{
					async.parallel({
						config: function(callback){
							fs.writeFile(proyectPath+'/mark-posts.config', JSON.stringify(config), function (err) {
								if (err){
									err = new Error('Error when generating the config file: mark-posts.config');
          							return callback(err);	
								}
								callback ();
							});
						},
						articles: function(callback){
							fs.mkdir(proyectPath+'/articles',function(err){
								if (err){
									err = new Error('Error when generating the articles directory');
	          						return callback(err);	
								} 
								callback();
							});		
						},
						process: function(callback){
							fs.mkdir(proyectPath+'/process',function(err){
								if (err){
									err = new Error('Error when generating the process directory');
          							return callback(err);	
								}
								callback();
							});		
						}
					},function(err){
						if (err){ 
							log.error(err);
						}
					});
				}
			});
		},
		generate : function(opt, callback){
			var dist = config.folder.dist.src;
			createifnotexit(dist, function(err){
				if(err){
					return callback(err);
				}
		      	async.parallel([
				function(cb){
					createifnotexit(dist+'/'+config.folder.dist.posts, function(err){
						if(err){
							return cb(err);
						}
						cb(null,'OK');
					});
				},function(cb){
					createifnotexit(dist+'/'+config.folder.dist.tags, function(err){
						if(err){
							return cb(err);
						}
						cb(null,'OK');
					});
				}
				],function(err){
					if (err){
						return callback(err);		
					}
					mm.parseDirectory(process.cwd() +'/'+ config.folder.articles, function(err, posts){
						generateFiles(posts);
					});
					return	callback(null, 'OK');	
				});  
			});
		}
	};
}());

exports  = module.exports = markposts;