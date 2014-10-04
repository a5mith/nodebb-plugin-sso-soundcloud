(function(module) {
	"use strict";

    var User = module.parent.require('./user'),
        meta = module.parent.require('./meta'),
        db = module.parent.require('../src/database'),
        passport = module.parent.require('passport'),
        passportSoundCloud = require('passport-soundcloud'),
        fs = module.parent.require('fs'),
        path = module.parent.require('path'),
        nconf = module.parent.require('nconf');

	var constants = Object.freeze({
		'name': "Soundcloud",
		'admin': {
			'route': '/plugins/sso-soundcloud',
			'icon': 'fa-soundcloud'
		}
	});

	var Soundcloud = {};

	Soundcloud.init = function(app, middleware, controllers) {
		function render(req, res, next) {
			res.render('admin/plugins/sso-soundcloud', {});
		}

		app.get('/admin/plugins/sso-soundcloud', middleware.admin.buildHeader, render);
		app.get('/api/templates/admin/plugins/sso-soundcloud', render);
	};

	Soundcloud.getStrategy = function(strategies, callback) {
		if (meta.config['social:soundcloud:app_id'] && meta.config['social:soundcloud:secret']) {
			passport.use(new passportSoundCloud({
				clientID: meta.config['social:soundcloud:app_id'],
				clientSecret: meta.config['social:soundcloud:secret'],
				callbackURL: nconf.get('url') + '/auth/soundcloud/callback'
			}, function(accessToken, refreshToken, profile, done) {
				Soundcloud.login(profile.id, profile.displayName, profile.emails[0].value, function(err, user) {
					if (err) {
						return done(err);
					}
					done(null, user);
				});
			}));

			strategies.push({
				name: 'soundcloud',
				url: '/auth/soundcloud',
				callbackURL: '/auth/soundcloud/callback',
				icon: 'soundcloud',
				scope: 'email'
			});
		}

		callback(null, strategies);
	};




	Soundcloud.login = function(scid, name, email, callback) {
		Soundcloud.getUidByScid(scid, function(err, uid) {
			if(err) {
				return callback(err);
			}

			if (uid !== null) {
				// Existing User
				callback(null, {
					uid: uid
				});
			} else {
				// New User
				var success = function(uid) {
					// Save soundcloud-specific information to the user
					user.setUserField(uid, 'scid', scid);
					db.setObjectField('scid:uid', scid, uid);
					callback(null, {
						uid: uid
					});
				};

				user.getUidByEmail(email, function(err, uid) {
					if(err) {
						return callback(err);
					}

					if (!uid) {
						user.create({username: name, email: email}, function(err, uid) {
							if(err) {
								return callback(err);
							}

							success(uid);
						});
					} else {
						success(uid); // Existing account -- merge
					}
				});
			}
		});
	}

	Soundcloud.getUidByFbid = function(scid, callback) {
		db.getObjectField('scid:uid', scid, function(err, uid) {
			if (err) {
				return callback(err);
			}
			callback(null, uid);
		});
	};

	Soundcloud.addMenuItem = function(custom_header, callback) {
		custom_header.authentication.push({
			"route": constants.admin.route,
			"icon": constants.admin.icon,
			"name": constants.name
		});

		callback(null, custom_header);
	}

	module.exports = Soundcloud;
}(module));