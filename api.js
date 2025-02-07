'use strict';
const mongoose = require('mongoose');
const { Schema } = mongoose;

mongoose.connect(process.env.DB);

const ReplySchema = new Schema({
  text: { type: String, required: true },
  delete_password: { type: String, required: true },
  created_on: { type: Date, default: Date.now },
  reported: { type: Boolean, default: false }
});

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
      
      const now = new Date();
      const thread = new Thread({
        text,
        delete_password,
        board,
        created_on: now,
        bumped_on: now
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
          .select({
            reported: 0,
            delete_password: 0,
            'replies.delete_password': 0,
            'replies.reported': 0
          })
          .sort({ bumped_on: -1 })
          .limit(10);

        threads.forEach(thread => {
          thread.replies = thread.replies.slice(-3).reverse();
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
        if (!thread) {
          return res.send('incorrect password');
        }
        if (thread.delete_password === delete_password) {
          await Thread.findByIdAndDelete(thread_id);
          res.send('success');
        } else {
          res.send('incorrect password');
        }
      } catch(err) {
        res.send('incorrect password');
      }
    })

    .put(async (req, res) => {
      const { thread_id } = req.body;
      
      try {
        const result = await Thread.findByIdAndUpdate(
          thread_id,
          { $set: { reported: true } }
        );
        if (!result) {
          return res.send('thread not found');
        }
        res.send('reported');
      } catch(err) {
        res.send('thread not found');
      }
    });
    
  app.route('/api/replies/:board')
    .post(async (req, res) => {
      const { thread_id, text, delete_password } = req.body;
      const board = req.params.board;
      const now = new Date();
      
      try {
        const thread = await Thread.findById(thread_id);
        if (!thread) {
          return res.json({ error: 'thread not found' });
        }
        
        thread.replies.push({
          text,
          delete_password,
          created_on: now
        });
        thread.bumped_on = now;
        
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
          .select({
            reported: 0,
            delete_password: 0,
            'replies.reported': 0,
            'replies.delete_password': 0
          });
          
        if (!thread) {
          return res.json({ error: 'thread not found' });
        }
        
        res.json(thread);
      } catch(err) {
        res.json({ error: 'could not get replies' });
      }
    })

    .delete(async (req, res) => {
      const { thread_id, reply_id, delete_password } = req.body;
      
      try {
        const thread = await Thread.findById(thread_id);
        if (!thread) {
          return res.send('incorrect password');
        }
        
        const reply = thread.replies.id(reply_id);
        if (!reply) {
          return res.send('incorrect password');
        }
        
        if (reply.delete_password === delete_password) {
          reply.text = '[deleted]';
          await thread.save();
          res.send('success');
        } else {
          res.send('incorrect password');
        }
      } catch(err) {
        res.send('incorrect password');
      }
    })

    .put(async (req, res) => {
      const { thread_id, reply_id } = req.body;
      
      try {
        const thread = await Thread.findById(thread_id);
        if (!thread) {
          return res.send('thread not found');
        }
        
        const reply = thread.replies.id(reply_id);
        if (!reply) {
          return res.send('reply not found');
        }
        
        reply.reported = true;
        await thread.save();
        res.send('reported');
      } catch(err) {
        res.send('report failed');
      }
    });
};
