'use strict';

function cryptoExtraCa(process, caCert) {
	const _secureContext = process.binding('crypto').SecureContext;
	if (!("_addRootCerts" in _secureContext.prototype)) {
		_secureContext.prototype._addRootCerts = _secureContext.prototype.addRootCerts;
		_secureContext.prototype.addRootCerts = function() {
			const ret = _secureContext.prototype._addRootCerts.apply(this, arguments);
			this.addCACert(caCert);
			return ret;
		}
	}
}

module.exports = cryptoExtraCa;
