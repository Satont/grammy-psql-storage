import { newDb } from 'pg-mem';
import { PsqlAdapter } from '../dist/mod'
import { Bot, Context, SessionFlavor, session } from 'grammy'

interface SessionData {
  pizzaCount: number;
}

interface StringSessionFlavor {
  get session(): string;
  set session(session: string | null | undefined);
}

test('Bot should be created', () => {
  expect(createBot()).not.toBeFalsy();
});

describe('Pizza counter test', () => {
  test('Pizza counter should be equals 0 on initial', async () => {
    const bot = createBot<SessionData>();
    const ctx = createMessage(bot);
    const client = new (newDb().adapters.createPg().Client)

    bot.use(session({
      initial:() => ({ pizzaCount: 0 }),
      storage: await PsqlAdapter.create({ tableName: 'sessions', client }),
    }));

    await bot.handleUpdate(ctx.update);

    bot.on('msg:text', (ctx) => {
      expect(ctx.session.pizzaCount).toEqual(0);
    });
  });

  test('Pizza counter should be equals 1 after first message', async () => {
    const bot = createBot<SessionData>();
    const client = new (newDb().adapters.createPg().Client)

    bot.use(session({
      initial: () => ({ pizzaCount: 0 }),
      storage: await PsqlAdapter.create({ tableName: 'sessions', client }),
    }));

    bot.hears('first', (ctx) => {
      ctx.session.pizzaCount = Number(ctx.session.pizzaCount) + 1;
    });
    
    bot.hears('second', (ctx) => {
      expect(ctx.session.pizzaCount).toEqual(1);
    });
    
    await bot.handleUpdate(createMessage(bot, 'first').update);
    await bot.handleUpdate(createMessage(bot, 'second').update);
  });
});

describe('Simple string test', () => {
  test('Should be changed', async () => {
    const client = new (newDb().adapters.createPg().Client)
    const bot = new Bot<Context & StringSessionFlavor>('fake-token', { 
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

    bot.use(session({
      initial: () => 'test',
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
  })
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