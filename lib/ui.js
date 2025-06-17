import chalk from 'chalk';

export function displayThread(comments) {
  console.log(chalk.bold('\n💬 Comment Thread:'));
  
  comments.forEach((comment, index) => {
    const author = comment.user?.login || comment.author?.login || 'Unknown';
    const body = comment.body.split('\n').slice(0, 5).join('\n');
    const isBot = author.includes('[bot]');
    
    console.log(`\n${chalk.dim(index + 1 + '.')} ${chalk.bold(author)} ${isBot ? '🤖' : '👤'}`);
    console.log(chalk.gray(body));
    
    if (comment.body.split('\n').length > 5) {
      console.log(chalk.dim('... [truncated]'));
    }
  });
}