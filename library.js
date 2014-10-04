(function(module) {
    "use strict";
    var User = module.parent.require('./user'),
        meta = module.parent.require('./meta'),
        db = module.parent.require('../src/database'),
        passport = module.parent.require('passport'),
        passportDropbox = require('passport-soundcloud').Strategy,
        fs = module.parent.require('fs'),
        path = module.parent.require('path'),
        nconf = module.parent.require('nconf');
    var constants = Object.freeze({
        'name': "Soundcloud Login",
        'admin': {
            'route': '/plugins/sso-soundcloud',
            'icon': 'fa-soundcloud'
        }
    });
    var Soundcloud = {};
    Soundcloud.init = function(app, middleware, controllers, callback) {
        function render(req, res, next) {
            res.render('admin/plugins/sso-soundcloud', {});
        }
        app.get('/admin/plugins/sso-soundcloud', middleware.admin.buildHeader, render);
        app.get('/api/admin/plugins/sso-soundcloud', render);
        callback();
    }
    Soundcloud.getStrategy = function(strategies, callback) {
        meta.settings.get('sso-soundcloud', function(err, settings) {
            if (!err && settings['id'] && settings['secret']) {
                passport.use(new passportSoundcloud({
                    clientID: settings['id'],
                    clientSecret: settings['secret'],
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
                    name: 'soundcloud-oauth2',
                    url: '/auth/soundcloud',
                    callbackURL: '/auth/soundcloud/callback',
                    icon: 'fa-soundcloud'
                });
            }
            callback(null, strategies);
        });
    };
    Soundcloud.login = function(soundcloudId, handle, email, callback) {
        Soundcloud.getUid(soundcloudId, function(err, uid) {
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
                    User.setUserField(uid, 'soundcloudId', soundcloudId);
                    db.setObjectField('soundcloudId:uid', soundcloudId, uid);
                    callback(null, {
                        uid: uid
                    });
                };
                User.getUidByEmail(email, function(err, uid) {
                    if(err) {
                        return callback(err);
                    }
                    if (!uid) {
                        User.create({username: handle, email: email}, function(err, uid) {
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
    };
    Soundcloud.getUid = function(souncloudId, callback) {
        db.getObjectField('soundcloudId:uid', soundcloudId, function(err, uid) {
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
    };
    Soundcloud.deleteUserData = function(uid, callback) {
        async.waterfall([
            async.apply(User.getUserField, uid, 'soundcloudId'),
            function(oAuthIdToDelete, next) {
                db.deleteObjectField('soundcloudId:uid', oAuthIdToDelete, next);
            }
        ], function(err) {
            if (err) {
                winston.error('[sso-oauth] Could not remove soundcloud data for uid ' + uid + '. Error: ' + err);
                return callback(err);
            }
            callback();
        });
    };
    module.exports = Soundcloud;
}(module));