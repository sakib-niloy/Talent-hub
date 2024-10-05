const db = require('../config/db');

exports.likeAudio = (req, res) => {
  const audioId = req.params.id;

  const query = 'UPDATE audios SET likes = likes + 1 WHERE id = ?';
  db.query(query, [audioId], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Error updating likes' });
    }
    res.status(200).json({ message: 'Audio liked successfully' });
  });
};
                                       