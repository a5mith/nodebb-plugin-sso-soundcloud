(function(module) {
    "use strict";

    var user = module.parent.require('./user'),
        meta = module.parent.require('./meta'),
        db = module.parent.require('../src/database'),
        passport = module.parent.require('passport'),
        passportSoundcloud = require('passport-soundcloud').Strategy,
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
                    console.log(profile);
                    Soundcloud.login(profile.id, profile.displayName, profile.avatar, function(err, user) {
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
                    icon: 'fa-soundcloud'
                });
            }
            callback(null, strategies);
        });
    };
    Soundcloud.login = function(soundcloudid, displayName, avatar, callback) {
        Soundcloud.getUid(soundcloudid, function(err, uid) {
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
                user.create({username: displayName}, function(err, uid) {
                    if(err) {
                        return callback(err);
                    }
// Save soundcloud-specific information to the user
                    user.setUserField(uid, 'soundcloudid', soundcloudid);
                    db.setObjectField('soundcloudid:uid', soundcloudid, uid);
// Save their photo, if present
                    if (avatar && avatar.length > 0) {
                        var photoUrl = avatar[0].value;
                        photoUrl = path.dirname(photoUrl) + '/' + path.basename(photoUrl, path.extname(photoUrl)).slice(0, -6) + 'bigger' + path.extname(photoUrl);
                        user.setUserField(uid, 'uploadedpicture', photoUrl);
                        user.setUserField(uid, 'picture', photoUrl);
                    }
                    callback(null, {
                        uid: uid
                    });
                });
            }
        });
    };
    Soundcloud.getUid = function(soundcloudid, callback) {
        db.getObjectField('soundcloudid:uid', soundcloudid, function(err, uid) {
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
            async.apply(User.getUserField, uid, 'soundcloudid'),
            function(oAuthIdToDelete, next) {
                db.deleteObjectField('soundcloudid:uid', oAuthIdToDelete, next);
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