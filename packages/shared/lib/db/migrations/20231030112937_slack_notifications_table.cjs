const DB_TABLE = '_nango_slack_notifications';

exports.up = async function (knex, _) {
    return knex.schema.withSchema('nango').createTable(DB_TABLE, function (table) {
        table.increments('id').primary();
        table.boolean('open').defaultTo(true).index();
        table.integer('environment_id').unsigned().references('id').inTable(`nango._nango_environments`).index();
        table.string('name').index();
        table.string('type');
        table.specificType('connection_list', 'integer ARRAY');
        table.timestamps(true, true);
    });
};

exports.down = async function (knex, _) {
    return knex.schema.withSchema('nango').dropTable(DB_TABLE);
};
