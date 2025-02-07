const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function() {
  let testThreadId;
  let testReplyId;
  const testBoard = 'test';
  const testPassword = 'testpass123';
  
  test('Creating a new thread', function(done) {
    chai.request(server)
      .post(`/api/threads/${testBoard}`)
      .send({
        text: 'Test Thread',
        delete_password: testPassword
      })
      .end(function(err, res) {
        assert.equal(res.status, 200);
        done();
      });
  });

  test('Viewing the 10 most recent threads with 3 replies each', function(done) {
    chai.request(server)
      .get(`/api/threads/${testBoard}`)
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.isArray(res.body);
        assert.isAtMost(res.body.length, 10);
        if(res.body.length > 0) {
          testThreadId = res.body[0]._id;
          assert.isAtMost(res.body[0].replies.length, 3);
        }
        done();
      });
  });

  test('Deleting a thread with the incorrect password', function(done) {
    chai.request(server)
      .delete(`/api/threads/${testBoard}`)
      .send({
        thread_id: testThreadId,
        delete_password: 'wrongpass'
      })
      .end(function(err, res) {
        assert.equal(res.text, 'incorrect password');
        done();
      });
  });

  test('Creating a new reply', function(done) {
    chai.request(server)
      .post(`/api/replies/${testBoard}`)
      .send({
        thread_id: testThreadId,
        text: 'Test Reply',
        delete_password: testPassword
      })
      .end(function(err, res) {
        assert.equal(res.status, 200);
        done();
      });
  });

  test('Viewing a single thread with all replies', function(done) {
    chai.request(server)
      .get(`/api/replies/${testBoard}`)
      .query({ thread_id: testThreadId })
      .end(function(err, res) {
        assert.equal(res.status, 200);
        assert.property(res.body, 'replies');
        if(res.body.replies.length > 0) {
          testReplyId = res.body.replies[0]._id;
        }
        done();
      });
  });

  test('Reporting a reply', function(done) {
    chai.request(server)
      .put(`/api/replies/${testBoard}`)
      .send({
        thread_id: testThreadId,
        reply_id: testReplyId
      })
      .end(function(err, res) {
        assert.equal(res.text, 'reported');
        done();
      });
  });

  test('Deleting a reply with the incorrect password', function(done) {
    chai.request(server)
      .delete(`/api/replies/${testBoard}`)
      .send({
        thread_id: testThreadId,
        reply_id: testReplyId,
        delete_password: 'wrongpass'
      })
      .end(function(err, res) {
        assert.equal(res.text, 'incorrect password');
        done();
      });
  });

  test('Deleting a reply with the correct password', function(done) {
    chai.request(server)
      .delete(`/api/replies/${testBoard}`)
      .send({
        thread_id: testThreadId,
        reply_id: testReplyId,
        delete_password: testPassword
      })
      .end(function(err, res) {
        assert.equal(res.text, 'success');
        done();
      });
  });

  test('Reporting a thread', function(done) {
    chai.request(server)
      .put(`/api/threads/${testBoard}`)
      .send({
        thread_id: testThreadId
      })
      .end(function(err, res) {
        assert.equal(res.text, 'reported');
        done();
      });
  });

  test('Deleting a thread with the correct password', function(done) {
    chai.request(server)
      .delete(`/api/threads/${testBoard}`)
      .send({
        thread_id: testThreadId,
        delete_password: testPassword
      })
      .end(function(err, res) {
        assert.equal(res.text, 'success');
        done();
      });
  });
});
