import { newDb } from 'https://deno.land/x/pg_mem/mod.ts';
import { Bot, Context, SessionFlavor, session } from 'https://deno.land/x/grammy/mod.ts';
import { expect } from 'https://deno.land/x/expect/mod.ts'
import { PsqlAdapter } from '../src/mod.ts';

interface SessionData {
  pizzaCount: number;
}

Deno.test('Bot should be created', () => {
  expect(createBot()).not.toBeFalsy()
})

Deno.test('Pizza counter tests', async () => {
  const client = new (newDb().adapters.createPg().Client)
  const bot = createBot<SessionData>();

  bot.use(session({
    initial: () => ({ pizzaCount: 0 }),
    storage: await PsqlAdapter.create({ tableName: 'sessions', client }),
  }));

  bot.hears('first', (ctx) => {
    expect(ctx.session.pizzaCount).toEqual(0)
    ctx.session.pizzaCount = Number(ctx.session.pizzaCount) + 1;
  });
  
  bot.hears('second', (ctx) => {
    expect(ctx.session.pizzaCount).toEqual(1);
  });
  
  await bot.handleUpdate(createMessage(bot, 'first').update);
  await bot.handleUpdate(createMessage(bot, 'second').update);

  client.close()
})

Deno.test('Simple string tests', async () => {
  const client = new (newDb().adapters.createPg().Client)

  type SimpleString = string
  const bot = createBot<SimpleString>();

  bot.use(session({
    initial() {
      return 'test';
    },
    storage: await PsqlAdapter.create({ tableName: 'sessions', client }),
  }));

  bot.hears('first', async (ctx) => {
    ctx.session = `${ctx.session} edited`;
  });
  
  bot.hears('second', async (ctx) => {
    expect(ctx.session).toEqual('test edited');
  });
  
  await bot.handleUpdate(createMessage(bot, 'first').update);
  await bot.handleUpdate(createMessage(bot, 'second').update);

  client.close()
})

function createBot<T>(token = 'fake-token') {
  return new Bot<Context & SessionFlavor<T>>(token, { 
    botInfo: {
      id: 42,
      first_name: 'Test Bot',
      is_bot: true,
      username: 'bot',
      can_join_groups: true,
      can_read_all_group_messages: true,
      supports_inline_queries: false,
    },
  });
}

function createMessage(bot: Bot<any>, text = 'Test Text') {
  const createRandomNumber = () => Math.floor(Math.random() * (123456789 - 1) + 1);

  const ctx = new Context({ 
    update_id: createRandomNumber(), 
    message: { 
      text,
      message_id: createRandomNumber(),
      chat: { 
        id: 1,
        type: 'private',
        first_name: 'Test User',
      },
      date: Date.now(),
    },
  }, 
  bot.api, 
  bot.botInfo
  );

  return ctx;
}