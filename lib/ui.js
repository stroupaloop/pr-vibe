import chalk from 'chalk';

export function displayThread(comments) {
  console.log(chalk.bold('\n💬 Comment Thread:'));
  
  comments.forEach((comment, index) => {
    const author = comment.user?.login || comment.author?.login || 'Unknown';
    const body = comment.body.split('\n').slice(0, 5).join('\n');
    const isBot = author.includes('[bot]') || comment.isBot;
    const isNit = comment.isNit;
    
    // Build author line with appropriate indicators
    let authorLine = `\n${chalk.dim(index + 1 + '.')} ${chalk.bold(author)} `;
    authorLine += isBot ? '🤖' : '👤';
    if (isNit) {
      authorLine += chalk.yellow(' [NIT]');
    }
    
    console.log(authorLine);
    console.log(chalk.gray(body));
    
    if (comment.body.split('\n').length > 5) {
      console.log(chalk.dim('... [truncated]'));
    }
  });
}