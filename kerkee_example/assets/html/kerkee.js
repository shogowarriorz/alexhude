;(function(window){
	if (window.WebViewJSBridge)
		return;
	window.WebViewJSBridge = {};

	console.log("--- kerkee init begin---");
	var browser={
        versions:function(){
            var u = navigator.userAgent, app = navigator.appVersion;
            return {
                trident: u.indexOf('Trident') > -1, //IE
                presto: u.indexOf('Presto') > -1, //opera
                webKit: u.indexOf('AppleWebKit') > -1, //apple&google kernel
                gecko: u.indexOf('Gecko') > -1 && u.indexOf('KHTML') == -1,//firfox
                mobile: !!u.match(/AppleWebKit.*Mobile.*/), //is Mobile
                ios: !!u.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/), //is ios
                android: u.indexOf('Android') > -1 || u.indexOf('Adr') > -1, //android
                iPhone: u.indexOf('iPhone') > -1 , //iPhone or QQHD
                iPad: u.indexOf('iPad') > -1, //iPad
                iPod: u.indexOf('iPod') > -1, //iPod
                webApp: u.indexOf('Safari') == -1, //is webapp,no header and footer
                weixin: u.indexOf('MicroMessenger') > -1, //is wechat
                qq: u.match(/\sQQ/i) == " qq" //is qq
            };
        }(),
        language:(navigator.browserLanguage || navigator.language).toLowerCase()
    }

	var global = this || window;
	var ApiBridge ={
		msgQueue : [],
		callbackCache : [],
		callbackId : 0,
		processingMsg : false,
		isReady : false,
		isNotifyReady : false,
        initCompletePromise: null
	};

	ApiBridge.create = function()
	{
		ApiBridge.bridgeIframe = document.createElement("iframe");
		ApiBridge.bridgeIframe.style.display = 'none';
		document.documentElement.appendChild(ApiBridge.bridgeIframe);
	};

	ApiBridge.prepareProcessingMessages = function()
	{
		ApiBridge.processingMsg = true;
	};

	ApiBridge.fetchMessages = function()
	{
		if (ApiBridge.msgQueue.length > 0)
		{
			var messages = JSON.stringify(ApiBridge.msgQueue);
			ApiBridge.msgQueue.length = 0;
			return messages;
		}
		ApiBridge.processingMsg = false;
		return null;
	};

	ApiBridge.callNative = function(clz, method, args, callback)
	{
		var msgJson = {};
		msgJson.clz = clz;
		msgJson.method = method;
		if (args != undefined)
			msgJson.args = args;

		if (callback)
		{
			var callbackId = ApiBridge.getCallbackId();
			ApiBridge.callbackCache[callbackId] = callback;
			if (msgJson.args)
			{
				msgJson.args.callbackId = callbackId.toString();
			}
			else
			{
				msgJson.args =
				{
					"callbackId" : callbackId.toString()
				};
			}
		}

		if (browser.versions.ios)
		{
			if (ApiBridge.bridgeIframe == undefined)
			{
				ApiBridge.create();
			}
			// var msgJson = {"clz": clz, "method": method, "args": args};
			ApiBridge.msgQueue.push(msgJson);
			if (!ApiBridge.processingMsg)
				ApiBridge.bridgeIframe.src = "kcnative://go";
		}
		else if (browser.versions.android)
		{
			// android
			return prompt(JSON.stringify(msgJson));
		}

	};



	ApiBridge.log = function(msg)
	{
		ApiBridge.callNative("ApiBridge", "JSLog",
		{
			"msg" : msg
		});
	}

	ApiBridge.getCallbackId = function()
	{
		return ApiBridge.callbackId++;
	}

	ApiBridge.onCallback = function(callbackId, obj)
	{
		if (ApiBridge.callbackCache[callbackId])
		{
			ApiBridge.callbackCache[callbackId](obj);
			// ApiBridge.callbackCache[callbackId] = undefined;
			// //????????????????????????????????????undefined???
		}
	}

	ApiBridge.onBridgeInitComplete = function(callback)
	{
		ApiBridge.callNative("ApiBridge", "onBridgeInitComplete", {}, callback);
	}

	ApiBridge.onNativeInitComplete = function(callback)
	{
		ApiBridge.isReady = true;
		console.log("--- kerkee onNativeInitComplete end ---");

		if (callback)
		{
			callback();
			ApiBridge.isNotifyReady = true;
			console.log("--- device ready go--- ");
		}
	}

	ApiBridge.compile = function(aIdentity, aJS)
	{
		var value;
		var error;
		try
		{
			value = eval(aJS);
		}
		catch (e)
		{
			// error = "name: " + e.name +"; errorNumber: " + (e.number & 0xFFFF ) + "; message: " + e.message;
			var err = {};
			err.name = e.name;
			err.message = e.message;
			err.number = e.number & 0xFFFF;
			error = err;
		}

		ApiBridge.callNative("ApiBridge", "compile",
		{
			"identity" : aIdentity,
			"returnValue" : value,
			"error" : error
		});
	}

    if (typeof Promise === 'function') {
        ApiBridge.Promise = Promise
    } else {
        ApiBridge.Promise = easyPromise;
    }
    function easyPromise(callback) {
        var PENDING = 'pending';
        var DONE = 'done';
        var doneCallbacksArr = [];

        var state = PENDING;

        var resolve = function() {
            state = DONE;
            dispatch(doneCallbacksArr);
        }

        this.then = function(cb) {
            if (state === DONE) {
                setTimeout(function () {
                    cb();
                }, 0);
            }

            if (state === PENDING) {
                doneCallbacksArr.push(cb);
            }
        }

        var dispatch = function(cbs) {
            var cb;
            while (cb = cbs.shift()) {
                setTimeout((function (fn) {
                    return function () {
                        fn();
                    };
                })(cb), 0);
            }
        }

        callback(resolve);
    }

	var	_Configs =
    {
        isOpenJSLog:false,
        sysLog:{},
        isOpenNativeXHR:true,
        sysXHR:{}
    };
    _Configs.sysLog = global.console.log;
    _Configs.sysXHR = global.XMLHttpRequest;


	var kerkee = {};

	/*****************************************
   	 * ????????????
     *****************************************/
	kerkee.Event = {};
	// kerkee.Event.LOADED = "loaded";
	// kerkee.Event.LOAD_ERROR = "load_error";
	// kerkee.Event.LOAD_PROGRESS = "load_progress";
	kerkee.addEventListener = function(event, callback)
	{
		ApiBridge.callNative("event", "addEventListener",
		{
			"event" : event
		}, callback);
	}

	/* Scroll to the bottom of the page when the callback function and the threshold setting */
	//callback:Return to the page in webview upper vertex Y value
	kerkee.registerHitPageBottomListener = function(callback, threshold)
	{
		ApiBridge.callNative("ApiBridge", "setHitPageBottomThreshold",
		{
			"threshold" : threshold
		});
		kerkee.onHitPageBottom = callback;
	};

	kerkee.registerScrollListener = function(callback)
	{
		ApiBridge.callNative("ApiBridge", "setPageScroll",
    	{
   			"isScrollOn" : true
   		});
   		kerkee.onPageScroll = callback;
	};

	/*****************************************
	 * ??????
	 *****************************************/
	kerkee.testJSBrige = function(aString)
	{
		ApiBridge.callNative("jsBridgeClient", "testJSBrige",
		{
			"info" : aString
		});
	};

	kerkee.openJSLog = function()
	{
		_Configs.isOpenJSLog = true;
		global.console.log = ApiBridge.log;
	}
	kerkee.closeJSLog = function()
	{
		_Configs.isOpenJSLog = false;
        global.console.log = _Configs.sysLog;
	}


	kerkee.commonApi = function(aString, callback)
	{
		ApiBridge.callNative("jsBridgeClient", "commonApi",
		{
			"info" : aString
		}, callback);
	}

	kerkee.onDeviceReady = function(handler)
	{
		ApiBridge.onDeviceReady = handler;

		if (ApiBridge.isReady && !ApiBridge.isNotifyReady && handler)
		{
			console.log("-- device ready --");
			handler();
			ApiBridge.isNotifyReady = true;
		}
	};

	kerkee.invoke = function(clz, method, args, callback)
	{
        ApiBridge.initCompletePromise.then(function() {
            if (callback)
            {
                ApiBridge.callNative(clz, method, args, callback);
            }
            else
            {
                ApiBridge.callNative(clz, method, args);
            }
        });
	};

	kerkee.onSetImage = function(srcSuffix, desUri)
	{
		// console.log("--- kerkee onSetImage ---");
		var obj = document.querySelectorAll('img[src$="' + srcSuffix + '"]');
		for (var i = 0; i < obj.length; ++i)
		{
			obj[i].src = desUri;
		}
	};


	/*****************************************
	 * XMLHttpRequest??????
	 *****************************************/

	var _XMLHttpRequest = function()
	{
		this.id = _XMLHttpRequest.globalId++;
		_XMLHttpRequest.cache[this.id] = this;

		this.status = 0;
		this.statusText = '';
		this.readyState = 0;
		this.responseText = '';
		this.headers = {};
		this.onreadystatechange = undefined;

		ApiBridge.callNative('XMLHttpRequest', 'create',
		{
			"id" : this.id
		});
	}

	_XMLHttpRequest.globalId = Math.floor(Math.random()*1000);
	_XMLHttpRequest.cache = [];
	_XMLHttpRequest.setProperties = function(jsonObj)
	{
		var id = jsonObj.id;
		if (_XMLHttpRequest.cache[id])
		{
			var obj = _XMLHttpRequest.cache[id];

			if (jsonObj.hasOwnProperty('status'))
			{
				obj.status = jsonObj.status;
			}
			if (jsonObj.hasOwnProperty('statusText'))
			{
				obj.statusText = jsonObj.statusText;
			}
			if (jsonObj.hasOwnProperty('readyState'))
			{
				obj.readyState = jsonObj.readyState;
			}
			if (jsonObj.hasOwnProperty('responseText'))
			{
				obj.responseText = jsonObj.responseText;
			}
			if (jsonObj.hasOwnProperty('headers'))
			{
				obj.headers = jsonObj.headers;
			}

			if (_XMLHttpRequest.cache[id].onreadystatechange)
			{
				_XMLHttpRequest.cache[id].onreadystatechange();
			}
		}
	}

	_XMLHttpRequest.prototype.open = function(method, url, async)
	{
		ApiBridge.callNative('XMLHttpRequest', 'open',
		{
			"id" : this.id,
			"method" : method,
			"url" : url,
			"scheme" : window.location.protocol,
			"host" : window.location.hostname,
			"port" : window.location.port,
			"href" : window.location.href,
			"referer" : document.referrer != "" ? document.referrer : undefined,
			"useragent" : navigator.userAgent,
			"cookie" : document.cookie != "" ? document.cookie : undefined,
			"async" : async,
			"timeout" : this.timeout
		});
	}

	_XMLHttpRequest.prototype.send = function(data)
	{
		if (data != null)
		{
			ApiBridge.callNative('XMLHttpRequest', 'send',
			{
				"id" : this.id,
				"data" : data
			});
		}
		else
		{
			ApiBridge.callNative('XMLHttpRequest', 'send',
			{
				"id" : this.id
			});
		}
	}
	_XMLHttpRequest.prototype.overrideMimeType = function(mimetype)
	{
		ApiBridge.callNative('XMLHttpRequest', 'overrideMimeType',
		{
			"id" : this.id,
			"mimetype" : mimetype
		});
	}
	_XMLHttpRequest.prototype.abort = function()
	{
		ApiBridge.callNative('XMLHttpRequest', 'abort',
		{
			"id" : this.id
		});
	}
	_XMLHttpRequest.prototype.setRequestHeader = function(headerName,
			headerValue)
	{
		ApiBridge.callNative('XMLHttpRequest', 'setRequestHeader',
		{
			"id" : this.id,
			"headerName" : headerName,
			"headerValue" : headerValue
		});
	}
	_XMLHttpRequest.prototype.getAllResponseHeaders = function()
	{
		var strHeaders = '';
		for ( var name in this.headers)
		{
			strHeaders += (name + ": " + this.headers[name] + "\r\n");
		}
		return strHeaders;
	}
	_XMLHttpRequest.prototype.getResponseHeader = function(headerName)
	{
		var strHeaders;
		var upperCaseHeaderName = headerName.toUpperCase();
		for ( var name in this.headers)
		{
			if (upperCaseHeaderName == name.toUpperCase())
				strHeaders = this.headers[name]
		}
		return strHeaders;
	}
	_XMLHttpRequest.deleteObject = function(id)
	{
		if (_XMLHttpRequest.cache[id])
		{
			_XMLHttpRequest.cache[id] = undefined;
		}
	}

	/*
	 * var windowOpen = function (url) { ApiBridge.callNative("JavascriptAPIInterceptor", "windowOpen", { "url" : url }); };
	 */
	global.ApiBridge = ApiBridge;
	global.kerkee = kerkee;
	// global.open = windowOpen;
	global.XMLHttpRequest = _XMLHttpRequest;
	global.jsBridgeClient = kerkee;

	kerkee.register = function(_window)
	{
		_window.ApiBridge = window.ApiBridge;
		_window.kerkee = window.kerkee;
		_window.console.log = window.console.log;
		_window.XMLHttpRequest = window.XMLHttpRequest;
		_window.open = window.open;
	};

    ApiBridge.initCompletePromise = new ApiBridge.Promise(function(resolve) {
        ApiBridge.onBridgeInitComplete(function(aConfigs)
        {
            if (aConfigs)
            {
                if (aConfigs.hasOwnProperty('isOpenJSLog'))
                {
                    _Configs.isOpenJSLog = aConfigs.isOpenJSLog;
                }
                if (aConfigs.hasOwnProperty('isOpenNativeXHR'))
                {
                    _Configs.isOpenNativeXHR = aConfigs.isOpenNativeXHR;
                }
            }

            if (_Configs.isOpenJSLog)
            {
                global.console.log = ApiBridge.log;
            }

            ApiBridge.onNativeInitComplete(ApiBridge.onDeviceReady);

            resolve();
        });
    })


})(window);
