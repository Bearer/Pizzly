const DB_TABLE = '_nango_ui_notifications';

exports.up = async function (knex, _) {
    return knex.schema.createTable(DB_TABLE, function (table) {
        table.increments('id').primary();
        table.string('type', 'varchar(255)').notNullable();
        table.string('action', 'varchar(255)').notNullable();
        table.integer('connection_id').unsigned().notNullable();
        table.foreign('connection_id').references('id').inTable('_nango_connections').onDelete('CASCADE');
        table.integer('activity_log_id').unsigned().notNullable();
        table.foreign('activity_log_id').references('id').inTable('_nango_activity_logs').onDelete('CASCADE');
        table.boolean('active').defaultTo(true);
        table.uuid('sync_id').defaultTo(null);
        table.foreign('sync_id').references('id').inTable('_nango_syncs').onDelete('CASCADE');
        table.timestamps(true, true);
    });
};

exports.down = async function (knex, _) {
    return knex.schema.dropTable(DB_TABLE);
};
