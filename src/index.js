const {port,env} = require('./config/vars');
const app = require('./config/koa');
// const someSchedule = require('./config/scheduler');

app.listen(port);
// someSchedule.invoke(new Date().getTime());

console.log(`chalu ho gaya at ${port} in ${env} mode`);