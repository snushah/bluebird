"use strict";
var assert = require("assert");
var Promise = require("../../js/bluebird_debug.js");
var adapter = require("../../js/bluebird_debug.js");
var fulfilled = adapter.fulfilled;
var rejected = adapter.rejected;
var pending = adapter.pending;

var haveTypeErrors = typeof TypeError !== "undefined";

//Since there is only a single handler possible at a time, older
//tests that are run just before this file could affect the results
//that's why there is 500ms limit in grunt file between each test
//beacuse the unhandled rejection handler will run within 100ms right now
function onUnhandledFail() {
    Promise.onPossiblyUnhandledRejection(function(e){
        assert.fail("Reporting handled rejection as unhandled");
    });
}

function onUnhandledSucceed( done, testAgainst ) {
    Promise.onPossiblyUnhandledRejection(function(e){
         if( testAgainst !== void 0 ) {
             assert.equal(testAgainst, e );
         }
         onDone(done)();
    });
}

function onDone(done) {
    return function() {
        Promise.onPossiblyUnhandledRejection(null);
        done();
    };
};

function e() {
    var ret = new Error();
    ret.propagationTest = true;
    return ret;
}

function notE() {
    var rets = [null, void 0, "", 3, {}, [], true, false];
    return rets[Math.random()*rets.length|0];
}

describe("Will report rejections that are not handled in time", function() {

    specify("Immediately rejected not handled at all", function(done) {
        onUnhandledSucceed(done);
        var promise = pending();
        promise.reject(e());
    });
    specify("Eventually rejected not handled at all", function(done) {
        onUnhandledSucceed(done);
        var promise = pending();
        setTimeout(function(){
            promise.reject(e());
        }, 50);
    });



    specify("Immediately rejected handled too late", function(done) {
        onUnhandledSucceed(done);
        var promise = pending();
        promise.reject(e());
        setTimeout( function() {
            promise.promise.caught(function(){});
        }, 120 );
    });
    specify("Eventually rejected handled too late", function(done) {
        onUnhandledSucceed(done);
        var promise = pending();
        setTimeout(function(){
            promise.reject(e());
        }, 20);
        setTimeout( function() {
            promise.promise.caught(function(){});
        }, 160 );
    });
});

describe("Will report rejections that are code errors", function() {

    specify("Immediately fulfilled handled with erroneous code", function(done) {
        onUnhandledSucceed(done);
        var deferred = pending();
        var promise = deferred.promise;
        deferred.fulfill(null);
        promise.then(function(itsNull){
            itsNull.will.fail.for.sure();
        });
    });
    specify("Eventually fulfilled handled with erroneous code", function(done) {
        onUnhandledSucceed(done);
        var deferred = pending();
        var promise = deferred.promise;
        setTimeout(function(){
            deferred.fulfill(null);
        }, 40);
        promise.then(function(itsNull){
            itsNull.will.fail.for.sure();
        });
    });

    specify("Already fulfilled handled with erroneous code but then recovered and failed again", function(done) {
        var err = e();
        onUnhandledSucceed(done, err);
        var promise = fulfilled(null);
        promise.then(function(itsNull){
            itsNull.will.fail.for.sure();
        }).caught(function(e){
            if( haveTypeErrors )
                assert.ok( e instanceof TypeError )
        }).then(function(){
            //then failing again
            //this error should be reported
            throw err;
        });
    });

    specify("Immediately fulfilled handled with erroneous code but then recovered and failed again", function(done) {
        var err = e();
        onUnhandledSucceed(done, err);
        var deferred = pending();
        var promise = deferred.promise;
        deferred.fulfill(null);
        promise.then(function(itsNull){
            itsNull.will.fail.for.sure();
        }).caught(function(e){
            if( haveTypeErrors )
                assert.ok( e instanceof TypeError )
            //Handling the type error here
        }).then(function(){
            //then failing again
            //this error should be reported
            throw err;
        });
    });

    specify("Eventually fulfilled handled with erroneous code but then recovered and failed again", function(done) {
        var err = e();
        onUnhandledSucceed(done, err);
        var deferred = pending();
        var promise = deferred.promise;

        promise.then(function(itsNull){
            itsNull.will.fail.for.sure();
        }).caught(function(e){
            if( haveTypeErrors )
                assert.ok( e instanceof TypeError )
            //Handling the type error here
        }).then(function(){
            //then failing again
            //this error should be reported
            throw err;
        });

        setTimeout(function(){
            deferred.fulfill(null);
        }, 40 );
    });

    specify("Already fulfilled handled with erroneous code but then recovered in a parallel handler and failed again", function(done) {
        var err = e();
        onUnhandledSucceed(done, err);
        var promise = fulfilled(null);
        promise.then(function(itsNull){
            itsNull.will.fail.for.sure();
        }).caught(function(e){
            if( haveTypeErrors )
                assert.ok( e instanceof TypeError )
        });

        promise.caught(function(e) {
            if( haveTypeErrors )
                assert.ok( e instanceof TypeError )
            //Handling the type error here
        }).then(function(){
            //then failing again
            //this error should be reported
            throw err;
        });
    });

    specify("Errors are reported in depth-first order", function(done) {
        var err = e();

        Promise.onPossiblyUnhandledRejection(function(e){
            assert.equal(e, err);
            Promise.onPossiblyUnhandledRejection(function(e){
                if( haveTypeErrors )
                    assert.ok( e instanceof TypeError );

                Promise.onPossiblyUnhandledRejection( null );
                done();
            });
        });
        var promise = fulfilled(null);

        promise.caught(function(e) {
            if( haveTypeErrors )
                assert.ok( e instanceof TypeError )
            //Handling the type error here
        }).then(function(){
            //then failing again
            //this error should be reported
            throw err;
        });

        promise.then(function(itsNull){
            itsNull.will.fail.for.sure();
        });

    });

});

describe("Will not report rejections that are not instanceof Error", function() {

    specify("Already rejected with non instanceof Error", function(done) {
        onUnhandledFail();

        var failed = rejected(notE());
        var failed2 = rejected(notE());

        setTimeout( onDone(done), 175 );
    });

    specify("Immediately rejected with non instanceof Error", function(done) {
        onUnhandledFail();

        var failed = pending();
        var failed2 = pending();
        failed.reject(notE());
        failed2.reject(notE());

        setTimeout( onDone(done), 175 );

    });


    specify("Eventually rejected with non instanceof Error", function(done) {
        onUnhandledFail();

        var failed = pending();
        var failed2 = pending();

        setTimeout(function(){
            failed.reject(notE());
            failed2.reject(notE());
        }, 80 );

        setTimeout( onDone(done), 175 );

    });
});

describe("Will not report rejections that are handled in time", function() {


    specify("Already rejected handled", function(done) {
        onUnhandledFail();

        var failed = rejected(e());

        failed.caught(function(){

        });

        setTimeout( onDone(done), 175 );
    });

    specify("Immediately rejected handled", function(done) {
        onUnhandledFail();

        var failed = pending();

        failed.promise.caught(function(){

        });

        failed.reject(e());

        setTimeout( onDone(done), 175 );

    });


    specify("Eventually rejected handled", function(done) {
        onUnhandledFail();

        var failed = pending();

        failed.promise.caught(function(){

        });

        setTimeout(function(){
            failed.reject(e());
        }, 80 );

        setTimeout( onDone(done), 175 );

    });




    specify("Already rejected handled in a deep sequence", function(done) {
        onUnhandledFail();

        var failed = rejected(e());

        failed
            .then(function(){})
            .then(function(){}, null, function(){})
            .then()
            .then(function(){})
            .caught(function(){
            });


        setTimeout( onDone(done), 175 );
    });

    specify("Immediately rejected handled in a deep sequence", function(done) {
        onUnhandledFail();

        var failed = pending();

        failed.promise.then(function(){})
            .then(function(){}, null, function(){})
            .then()
            .then(function(){})
            .caught(function(){

        });


        failed.reject(e());

        setTimeout( onDone(done), 175 );

    });


    specify("Eventually handled in a deep sequence", function(done) {
        onUnhandledFail();

        var failed = pending();

        failed.promise.then(function(){})
            .then(function(){}, null, function(){})
            .then()
            .then(function(){})
            .caught(function(){

        });


        setTimeout(function(){
            failed.reject(e());
        }, 80 );

        setTimeout( onDone(done), 175 );

    });


    specify("Already rejected handled in a middle parallel deep sequence", function(done) {
        onUnhandledFail();

        var failed = rejected(e());

        failed
            .then(function(){})
            .then(function(){}, null, function(){})
            .then()
            .then(function(){});

        failed
            .then(function(){})
            .then(function(){}, null, function(){})
            .caught(function(){
            });

        failed
            .then(function(){})
            .then(function(){}, null, function(){})
            .then()
            .then(function(){});


        setTimeout( onDone(done), 175 );
    });

    specify("Immediately rejected handled in a middle parallel deep  sequence", function(done) {
        onUnhandledFail();

        var failed = pending();

        failed.promise
            .then(function(){})
            .then(function(){}, null, function(){})
            .then()
            .then(function(){});

        failed.promise
            .then(function(){})
            .then(function(){}, null, function(){})
            .caught(function(){
            });

        failed.promise
            .then(function(){})
            .then(function(){}, null, function(){})
            .then()
            .then(function(){});

        failed.reject(e());

        setTimeout( onDone(done), 175 );

    });


    specify("Eventually handled in a middle parallel deep sequence", function(done) {
        onUnhandledFail();

        var failed = pending();

        failed.promise
            .then(function(){})
            .then(function(){}, null, function(){})
            .then()
            .then(function(){});

        failed.promise
            .then(function(){})
            .then(function(){}, null, function(){})
            .caught(function(){
            });

        failed.promise
            .then(function(){})
            .then(function(){}, null, function(){})
            .then()
            .then(function(){});


        setTimeout(function(){
            failed.reject(e());
        }, 80 );

        setTimeout( onDone(done), 175 );

    });


});