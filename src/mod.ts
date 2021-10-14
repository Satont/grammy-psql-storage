import { Client, StorageAdapter } from './deps.deno.ts'

interface AdapterConstructor {
  client: Client;
  tableName: string,
}

const defaultOpts: Omit<AdapterConstructor, 'client'> = {
  tableName: 'sessions'
}

export class PsqlAdapter<T> implements StorageAdapter<T> {
  private client: Client
  private tableName: string

  /**
    * @private
  */
  private constructor(opts: AdapterConstructor) {
    this.client = opts.client
    this.tableName = opts.tableName
  }

  static async create(opts = defaultOpts as AdapterConstructor) {
    const query = `CREATE TABLE IF NOT EXISTS "${opts.tableName}" ("id" SERIAL NOT NULL, "key" VARCHAR NOT NULL, "value" TEXT)`
    await opts.client.query(query)

    return new PsqlAdapter(opts)
  }

  private async findSession(key: string) {
    const results = await this.client.query(`select * from "${this.tableName}" where key = '${key}'`)
    const session = results.rows[0]

    return session
  }

  async read(key: string) {
    const session = await this.findSession(key)

    if (!session) {
      return undefined
    }

    return JSON.parse(session.value as string) as T
  }

  async write(key: string, value: T) {
    if (await this.findSession(key)) {
      await this.client.query(`update "${this.tableName}" SET value = '${JSON.stringify(value)}' where key = '${key}'`)
    } else {
      await this.client.query(`insert into "${this.tableName}" (key, value) values ('${key}', '${JSON.stringify(value)}')`)
    }
  }

  async delete(key: string) {
    await this.client.query(`delete from ${this.tableName} where key = '${key}'`)
  }
}
