const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function sourceEvidence(root) {
  const listed = execFileSync('git', ['ls-files', '-co', '--exclude-standard', '-z'], { cwd: root })
    .toString('utf8').split('\0').filter(Boolean).sort();
  const digest = crypto.createHash('sha256');
  let files = 0;
  for (const relative of listed) {
    const absolute = path.join(root, relative);
    if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) continue;
    digest.update(relative);
    digest.update('\0');
    digest.update(fs.readFileSync(absolute));
    files += 1;
  }
  return { sha256: digest.digest('hex'), files };
}

module.exports = { sourceEvidence };
