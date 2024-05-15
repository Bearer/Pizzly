exports.up = async function (knex, _) {
    return knex.schema.alterTable('_nango_environments', function (table) {
        table.text('webhook_url_secondary');
    });
};

exports.down = function (knex, _) {
    return knex.schema.alterTable('_nango_environments', function (table) {
        table.dropColumn('webhook_url_secondary');
    });
};
