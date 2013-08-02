function MailUpClient(inClientId, inClientSecret, inCallbackUri) {

    this.logonEndpoint = "https://services.mailup.com/Authorization/OAuth/LogOn";
    this.authorizationEndpoint = "https://services.mailup.com/Authorization/OAuth/Authorization";
    this.tokenEndpoint = "https://services.mailup.com/Authorization/OAuth/Token";
    this.consoleEndpoint = "https://services.mailup.com/API/v1/Rest/ConsoleService.svc";
    this.mailstatisticsEndpoint = "https://services.mailup.com/API/v1/Rest/MailStatisticsService.svc";
        
    this.clientId = inClientId;
    this.clientSecret = inClientSecret;
    this.callbackUri = inCallbackUri;
    this.accessToken = "";
    this.refreshToken = "";

    this.loadToken();
}

MailUpClient.prototype.getAjax = function() {
    var activexmodes=["Msxml2.XMLHTTP", "Microsoft.XMLHTTP"];
    if (window.ActiveXObject) {
        for (var i=0; i<activexmodes.length; i++) {
            try {
                return new ActiveXObject(activexmodes[i]);
            } catch(e) { }
        }
    } else if (window.XMLHttpRequest) return new XMLHttpRequest();
    else return false;
}
 
MailUpClient.prototype.getLogonEndpoint = function() {
    return this.logonEndpoint;
}
 
MailUpClient.prototype.setLogonEndpoint = function(value) {
    return this.logonEndpoint = value;
}
 
MailUpClient.prototype.getAuthorizationEndpoint = function() {
    return this.authorizationEndpoint;
}
 
MailUpClient.prototype.setAuthorizationEndpoint = function(value) {
    return this.authorizationEndpoint = value;
}
 
MailUpClient.prototype.getTokenEndpoint = function() {
    return this.tokenEndpoint;
}
 
MailUpClient.prototype.setTokenEndpoint = function(value) {
    return this.tokenEndpoint = value;
}
 
MailUpClient.prototype.getConsoleEndpoint = function() {
    return this.consoleEndpoint;
}
 
MailUpClient.prototype.setConsoleEndpoint = function(value) {
    return this.consoleEndpoint = value;
}
 
MailUpClient.prototype.getMailstatisticsEndpoint = function() {
    return this.mailstatisticsEndpoint;
}
 
MailUpClient.prototype.setMailstatisticsEndpoint = function(value) {
    return this.mailstatisticsEndpoint = value;
}

MailUpClient.prototype.getLogOnUri = function() {
    var url = this.getLogonEndpoint() + "?client_id=" + this.clientId + "&client_secret=" + this.clientSecret + "&response_type=code&redirect_uri=" + this.callbackUri;
    return url;
}

MailUpClient.prototype.logOn = function() {
    var url = this.getLogOnUri();
    window.location.replace(url);
}

MailUpClient.prototype.retreiveAccessTokenWithCode = function(code, onSuccess, onError) {
    var url = this.getTokenEndpoint() + "?code=" + code + "&grant_type=authorization_code";
    var request = this.getAjax();
    var m = this;
    request.onreadystatechange = function() {
        if (request.readyState == 4) {
            if (request.status == 200) {
		var result = JSON.parse(request.responseText);
		m.accessToken = result.access_token;
		m.refreshToken = result.refresh_token;
		onSuccess(m.accessToken);
            } else {
		onError("Error code "+request.status);
            }
        }
    };
    request.open("GET", url, true);
    request.send(null);
}

MailUpClient.prototype.retreiveAccessToken = function(login, password, onSuccess, onError) {
    var url = this.getAuthorizationEndpoint() + "?client_id=" + this.clientId + "&client_secret=" + this.clientSecret + "&response_type=code" +
                "&username=" + login + "&password=" + password;
    var request = this.getAjax();
    var m = this;
    request.onreadystatechange = function() {
        if (request.readyState == 4) {
            if (request.status == 200 || request.status == 302) {
		var result = JSON.parse(request.responseText);
		var code = result.code;
		m.retreiveAccessTokenWithCode(code, onSuccess, onError);
            } else {
		onError("Error code "+request.status);
            }
        }
    };
    request.open("GET", url, true);
    request.send(null);
}

MailUpClient.prototype.refreshAccessToken = function(onSuccess, onError) {
    var url = this.getTokenEndpoint();
    var body = "client_id=" + this.clientId + "&client_secret=" + this.clientSecret +
               "&refresh_token=" + this.refreshToken + "&grant_type=refresh_token";
    var request = this.getAjax();
    var m = this;
    request.onreadystatechange = function() {
        if (request.readyState == 4) {
            if (request.status == 200 || request.status == 302) {
		var result = JSON.parse(request.responseText);
		m.accessToken = result.access_token;
		m.refreshToken = result.refresh_token;
		onSuccess(m.accessToken);
            } else {
		onError("Error code "+request.status);
            }
        }
    };
    request.open("POST", url, true);
    request.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
    request.setRequestHeader("Content-Length", body.length);
    request.send(body);
}

MailUpClient.prototype.callMethod = function(url, verb, body, contentType, onSuccess, onError) {
    this.callMethodInternal(url, verb, body, contentType, true, onSuccess, onError);
}

MailUpClient.prototype.callMethodInternal = function(url, verb, body, contentType, refresh, onSuccess, onError) {
    var request = this.getAjax();
    var m = this;
    request.onreadystatechange = function() {
        if (request.readyState == 4) {
            if (request.status == 200) {
                onSuccess(request.responseText);
            } else if (request.status == 401 && refresh == true) {
                m.refreshAccessToken(function() {
                    m.callMethodInternal(url, verb, body, contentType, false, onSuccess, onError);
                }, onError);
            } else {
                onError("Error code "+request.status);
            }
        }
    };
    request.open(verb, url, true);
    request.setRequestHeader("Content-Type", contentType=="XML"?"application/xml":"application/json");
    request.setRequestHeader("Accept", contentType=="XML"?"application/xml":"application/json");
    request.setRequestHeader("Authorization", "Bearer " + this.accessToken);
    if (body != null && body != "") {
        request.setRequestHeader("Content-Length", body.length);
        request.send(body);
    } else {
        request.setRequestHeader("Content-Length", "0");
        request.send(null);
    }
}

MailUpClient.prototype.loadToken = function() {
    var str = document.cookie.replace(/(?:(?:^|.*;\s*)access_token\s*\=\s*([^;]*).*$)|^.*$/, "$1");
    if (str) this.access_token = str;

    var str2 = document.cookie.replace(/(?:(?:^|.*;\s*)refresh_token\s*\=\s*([^;]*).*$)|^.*$/, "$1");
    if (str2) this.refresh_token = str2;
}

MailUpClient.prototype.saveToken = function() {
    var exdate=new Date();
    exdate.setDate(exdate.getDate() + 30);
    document.cookie = "access_token="+accessToken+"; expires="+exdate.toUTCString();
    document.cookie = "refresh_token="+refreshToken+"; expires="+exdate.toUTCString();
}





