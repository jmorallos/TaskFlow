```javascript
await query(`
  INSERT INTO project_members (project_id, user_id, role) VALUES
    ($1, $2, 'admin'),
    ($1, $3, 'member'),
    ($1, $4, 'member'),

    ($5, $2, 'admin'),
    ($5, $4, 'admin'),
    ($5, $3, 'viewer'),

    ($6, $3, 'admin'),
    ($6, $2, 'member')
`, [
  taskflowProject.id,
  alex.id,
  sam.id,
  jordan.id,
  apiProject.id,
  designProject.id
]);
```

```javascript
await query(`
  INSERT INTO task_tags (task_id, tag_id) VALUES
    ($1, $2), ($1, $3),
    ($4, $5), ($4, $6),
    ($7, $8), ($7, $9),
    ($10, $11)
`, [
  tasks[3].id, tagMap['feature'], tagMap['backend'],   // auth task
  tasks[4].id, tagMap['feature'], tagMap['frontend'],  // router task
  tasks[6].id, tagMap['feature'], tagMap['frontend'],  // dashboard task
  tasks[7].id, tagMap['bug']                           // fix login task
]);
```

```javascript
await query(`
  INSERT INTO task_comments (task_id, author_id, content) VALUES
    ($1, $2, 'I''ve started on this. Using bcryptjs and jsonwebtoken packages.'),
    ($1, $3, 'Should we use refresh tokens too, or just long-lived JWTs for now?'),
    ($1, $2, 'Let''s keep it simple for v1 — 7-day JWT. We can add refresh tokens later.'),
    ($4, $3, 'Almost done with the router. History API pushState is working, just need to handle the back button properly.'),
    ($4, $2, 'Don''t forget to handle the case where someone links directly to a client-side route — the server needs to serve index.html for those.'),
    ($4, $5, 'Found a good pattern for this — popstate event on window handles the back button.')
`, [
  tasks[3].id, // $1 auth task
  alex.id,     // $2
  sam.id,      // $3
  tasks[4].id, // $4 router task
  jordan.id    // $5
]);
```

```javascript
await query(`
  INSERT INTO task_tags (task_id, tag_id) VALUES
    ($1, $2), ($1, $3),
    ($4, $5), ($4, $6),
    ($7, $8),
    ($9, $10)
`, [
  tasks[3].id, tagMap['feature'], tagMap['backend'],
  tasks[4].id, tagMap['feature'], tagMap['frontend'],
  tasks[6].id, tagMap['feature'],
  tasks[7].id, tagMap['bug']
]);
```