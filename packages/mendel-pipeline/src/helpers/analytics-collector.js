const chalk = require('chalk');
const table = require('text-table');
const prettyMs = require('pretty-ms');
const figure = require('figures');

const printer = (function Printer() {
    function groupData(data, column) {
        const grouping = {};

        data.forEach(point => {
            const columnName = point[column];
            grouping[columnName] = grouping[columnName] || [];

            grouping[columnName].push(point);
        });

        return grouping;
    }

    function println(text, indentation) {
        const indent = new Array(indentation + 1).join('  ');

        console.log(indent + text.replace('\n', '\n' + indent));
    }

    function getBarText(percent) {
        // 30 for buffer for other text
        const maxBarSize = (process.stdout.columns || 80) - 30;
        // -5 for displaying the number
        const barNumber = Math.max(Math.ceil(percent / 100 * maxBarSize), 1);
        return chalk.blue(new Array(barNumber + 1).join(figure.square)) + chalk.blue.dim(new Array(maxBarSize - barNumber + 1).join(figure.square));
    }

    return function print(data, dimensions, indentation=0) {
        const [dimension] = dimensions;
        const subData = groupData(data, dimension);

        if (dimensions.length === 1) {
            // aggregate the data and print
            const points = Object.keys(subData).map(groupedName => {
                const dataPart = subData[groupedName];
                const aggregate = dataPart.reduce((reduced, point) => reduced + point.data, 0);
                return {name: groupedName, aggregate};
            }).sort((a, b) => b.aggregate - a.aggregate);
            const totalAggregateTime = points.reduce((reduced, {aggregate}) => reduced + aggregate, 0);
            const tabledText = table(points.map(({name, aggregate}) => {
                const percent = aggregate / totalAggregateTime * 100;
                return [
                    name,
                    prettyMs(aggregate),
                    getBarText(percent),
                    `${Math.round(percent)}%`,
                ];
            }), {align: ['l', 'l', 'l', 'r']});
            println(tabledText, indentation);
        } else {
            Object.keys(subData).forEach(groupedName => {
                const dataPart = subData[groupedName];

                println(chalk.underline(groupedName), indentation);
                print(dataPart, dimensions.slice(1), indentation + 1);
            });
        }
    };
})();

class AnalyticsCollector {
    constructor() {
        global.analytics = this;

        process.on('message', () => this.record());
        this.data = [];
        this.processStart = Date.now();
    }

    connectProcess(childProces) {
        childProces.on('message', this.record.bind(this));
    }

    record(message) {
        if (!message || message.type !== 'analytics') return;
        const {grouping, pid, name, data} = message;
        this.data.push({
            group: grouping,
            subgroup: name || grouping,
            pid,
            data,
            timestamp: Date.now(),
        });
    }

    print() {
        // Print by group
        console.log(chalk.bgWhite.black('Sorted by grouping (aggregate of all thread)'));
        printer(this.data, ['group']);

        console.log(chalk.bgWhite.black('Sorted by subgroup'));
        printer(this.data, ['group', 'subgroup']);

        console.log(chalk.bgWhite.black('Sorted by process'));
        printer(this.data, ['group', 'pid']);

        console.log((new Array(process.stdout.columns || 80)).join(figure.line));
        console.log(chalk.white(`Process finished in ${chalk.bold(prettyMs(Date.now() - this.processStart))}.`));
    }
}

// Singleton
module.exports = (function() {return new AnalyticsCollector();})();
