'use strict';
const mongoose = require('mongoose');
const { Schema } = mongoose;

// 連接 MongoDB
mongoose.connect(process.env.DB);

// 定義 Reply Schema
const ReplySchema = new Schema({
  text: { type: String, required: true },
  delete_password: { type: String, required: true },
  created_on: { type: Date, default: Date.now },
  reported: { type: Boolean, default: false }
});

// 定義 Thread Schema
const ThreadSchema = new Schema({
  text: { type: String, required: true },
  delete_password: { type: String, required: true },
  board: { type: String, required: true },
  created_on: { type: Date, default: Date.now },
  bumped_on: { type: Date, default: Date.now },
  reported: { type: Boolean, default: false },
  replies: [ReplySchema]
});

const Thread = mongoose.model('Thread', ThreadSchema);

module.exports = function (app) {
  
  app.route('/api/threads/:board')
    .post(async (req, res) => {
      const { text, delete_password } = req.body;
      const board = req.params.board;
      
      const thread = new Thread({
        text,
        delete_password,
        board
      });

      try {
        await thread.save();
        res.redirect(`/b/${board}/`);
      } catch(err) {
        res.json({ error: 'could not create thread' });
      }
    })
    
    .get(async (req, res) => {
      const board = req.params.board;
      try {
        const threads = await Thread.find({ board })
          .select('-reported -delete_password')
          .sort('-bumped_on')
          .limit(10);

        threads.forEach(thread => {
          thread.replies = thread.replies.slice(-3);
        });

        res.json(threads);
      } catch(err) {
        res.json({ error: 'could not get threads' });
      }
    })

    .delete(async (req, res) => {
      const { thread_id, delete_password } = req.body;
      
      try {
        const thread = await Thread.findById(thread_id);
        if(thread.delete_password === delete_password) {
          await Thread.findByIdAndDelete(thread_id);
          res.send('success');
        } else {
          res.send('incorrect password');
        }
      } catch(err) {
        res.json({ error: 'could not delete thread' });
      }
    })

    .put(async (req, res) => {
      const { thread_id } = req.body;
      
      try {
        await Thread.findByIdAndUpdate(thread_id, { reported: true });
        res.send('reported');
      } catch(err) {
        res.json({ error: 'could not report thread' });
      }
    });
    
  app.route('/api/replies/:board')
    .post(async (req, res) => {
      const { thread_id, text, delete_password } = req.body;
      const board = req.params.board;
      
      try {
        const thread = await Thread.findById(thread_id);
        thread.replies.push({ text, delete_password });
        thread.bumped_on = new Date();
        await thread.save();
        res.redirect(`/b/${board}/${thread_id}`);
      } catch(err) {
        res.json({ error: 'could not add reply' });
      }
    })
    
    .get(async (req, res) => {
      const thread_id = req.query.thread_id;
      
      try {
        const thread = await Thread.findById(thread_id)
          .select('-reported -delete_password -replies.reported -replies.delete_password');
        res.json(thread);
      } catch(err) {
        res.json({ error: 'could not get replies' });
      }
    })

    .delete(async (req, res) => {
      const { thread_id, reply_id, delete_password } = req.body;
      
      try {
        const thread = await Thread.findById(thread_id);
        const reply = thread.replies.id(reply_id);
        
        if(reply.delete_password === delete_password) {
          reply.text = '[deleted]';
          await thread.save();
          res.send('success');
        } else {
          res.send('incorrect password');
        }
      } catch(err) {
        res.json({ error: 'could not delete reply' });
      }
    })

    .put(async (req, res) => {
      const { thread_id, reply_id } = req.body;
      
      try {
        const thread = await Thread.findById(thread_id);
        const reply = thread.replies.id(reply_id);
        reply.reported = true;
        await thread.save();
        res.send('reported');
      } catch(err) {
        res.json({ error: 'could not report reply' });
      }
    });

};
