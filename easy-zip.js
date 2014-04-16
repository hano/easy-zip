var util = require('util'),
	async = require('async'),
	path = require('path'),
	buffer = require('buffer'),
	fs = require('fs'),
	jszip = require('./jszip');

function EasyZip(){
	jszip.JSZip.apply(this,arguments);
}

util.inherits(EasyZip, jszip.JSZip);

function toArrayBuffer(buffer) {
    var ab = new ArrayBuffer(buffer.length),
    	view = new Uint8Array(ab);
    for (var i = 0; i < buffer.length; ++i) {
        view[i] = buffer[i];
    }
    return ab;
}

EasyZip.prototype.addFile = function(file,filePath,callback){
	var datas = [],
		me = this,
		rs = fs.createReadStream(filePath);

	rs.on('data',function(data){
		datas.push(data);
	})

	rs.on('end',function(){
//		var buf = Buffer.concat(datas);
//		me.file(file, toArrayBuffer(buf),{base64:false, binary: true, compression: 'STORE'});
		var buf = datas.join('');
        me.file(file, buf, {base64:false, binary: false, compression: 'STORE'});
		callback();
	})
}

EasyZip.prototype.batchAdd = function(files,callback) {
	var me = this;
	async.each(files,function(item,callback){
		var source = item.source,
			target = item.target,
			appender = me,
			folder = item.folder,
			fileName = path.basename(target),
			dirname = path.dirname(target);

		if(dirname!='.'){
			appender = me.folder(dirname);
		}

		if(source != null && source.trim()!=''){
			appender.addFile(fileName,source,function(){
				callback();
			});
		}else{
			//if no source ,make the target as folder
			me.folder(target);
			callback();
		}

	},function(){
		callback(me);
	});
}

EasyZip.prototype.zipFolder = function( folder, callback, options ) {

    options = options || {};
    var zips = [], rootFolder = '', file, stat, targetPath, sourcePath;

    if( options.rootFolder ) {
        rootFolder = options.rootFolder
    } else {
        rootFolder = path.basename(folder);
    }

    var walk = function( dir, done ) {
        var results = [];
        fs.readdir(dir, function( err, list ) {
            if( err ) {
                return done(err);
            }
            var targetPath, sourcePath;

            var nextEntry = function() {
                var file = list.shift();
                if( !file ) {
                    done(null, results);
                    return;
                }

                sourcePath = path.join(dir, file);
                targetPath = path.join(rootFolder, path.relative(folder, sourcePath));

                fs.stat(sourcePath, function( err, stat ) {
                    if( stat && stat.isDirectory() ) {
                        walk(sourcePath, function( err, res ) {
                            results.push({
                                target: targetPath
                            });

                            results = results.concat(res);
                            nextEntry();
                        });
                    } else {

                        results.push({
                            target: targetPath,
                            source: sourcePath
                        });
                        nextEntry();
                    }
                });
            }
            nextEntry();

        });
    };

    var me = this;
    walk(folder, function( err, zips ) {
        if(err) {
            console.log(err);
            return;
        }
        me.batchAdd(zips, function() {
            callback(null, me)
        });
    });
}

EasyZip.prototype.writeToResponse = function(response,attachmentName){
	attachmentName = attachmentName || new Date().getTime();
	attachmentName += '.zip';
	response.setHeader('Content-Disposition', 'attachment; filename="' +attachmentName + '"');
	response.write(this.generate({base64:false,compression:'DEFLATE'}),"binary");
	response.end();
}

EasyZip.prototype.writeToFile = function(filePath,callback){
		var data = this.generate({base64:false,compression:'DEFLATE'});
		fs.writeFile(filePath, data, 'binary',callback);
}

EasyZip.prototype.writeToFileSycn = function(filePath){
	  var data = this.generate({base64:false,compression:'DEFLATE'});
	  fs.writeFileSync(filePath, data, 'binary');
}

EasyZip.prototype.clone = function() {
   var newObj = new EasyZip();
   for (var i in this) {
      if (typeof this[i] !== "function") {
         newObj[i] = this[i];
      }
   }
   return newObj;
}

exports.EasyZip = EasyZip;
