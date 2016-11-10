const BasePrinter = require('./printer');
const chalk = require('chalk');
const table = require('text-table');
const prettyMs = require('pretty-ms');
const figure = require('figures');

function println(text, indentation) {
    const indent = new Array(indentation + 1).join('  ');

    console.log(indent + text.split('\n').join('\n' + indent));
}

function getBarText(percent, maxBarSize) {
    const barNumber = Math.max(Math.ceil(percent / 100 * maxBarSize), 1);
    return chalk.blue(new Array(barNumber + 1).join(figure.square)) + chalk.blue.dim(new Array(maxBarSize - barNumber + 1).join(figure.square));
}

function padLeft(str, width) {
    return (new Array(width - str.length + 1)).join(' ') + str;
}

function padRight(str, width) {
    return str + (new Array(width - str.length + 1)).join(' ');
}

class CliPrinter extends BasePrinter {
    constructor(options={}) {
        super(options);

        chalk.enabled = true && (options.enableColor || true);
        this.processStart = Date.now();

        this.nameMaxLen = options.nameMaxLen || 20;
    }

    groupData(data, columnIndex) {
        const grouping = {};

        data.forEach(point => {
            const columnName = point.name.split(':')[columnIndex];
            grouping[columnName] = grouping[columnName] || [];

            grouping[columnName].push(point);
        });

        return grouping;
    }

    _print(data, dimensions, indentation=0) {
        const [dimension] = dimensions;
        const subData = this.groupData(data, dimension);

        if (dimensions.length > 1) {
            return Object.keys(subData).forEach(groupedName => {
                const dataPart = subData[groupedName];

                println(chalk.underline(groupedName), indentation);
                this._print(dataPart, dimensions.slice(1), indentation + 1);
            });
        }

        // Group/aggregate the data
        const points = Object.keys(subData).map(groupedName => {
            const dataPart = subData[groupedName];
            const aggregate = dataPart.reduce((reduced, point) => reduced + point.after - point.before, 0);
            return {name: groupedName, aggregate};
        }).sort((a, b) => b.aggregate - a.aggregate);
        // Sum all time in this particular group for percentage
        const totalAggregateTime = points.reduce((reduced, {aggregate}) => reduced + aggregate, 0);
        // Textify
        const tabledText = table(points.map(({name, aggregate}) => {
            const percent = aggregate / totalAggregateTime * 100;
            // 7 for the time string, 4 for percent string, 3 to compensate for column char of the table
            const maxBarSize = (process.stdout.columns || 80) - this.nameMaxLen - 7 - 4 - 6;

            return [
                // maximum of 20
                padRight(name.slice(0, this.nameMaxLen), this.nameMaxLen - indentation * 2),
                // max of 7 characters
                padLeft(prettyMs(aggregate).slice(0, 7), 7),
                getBarText(percent, maxBarSize),
                // maximum of 4 character (number + '%')
                padLeft(`${Math.round(percent)}%`, 4),
            ];
        }), {align: ['l', 'r', 'l', 'r']});

        println(tabledText, indentation);
    }

    print(data) {
        console.log(chalk.bgWhite.black('Sorted by grouping (aggregate of all thread)'));
        this._print(data, [1], 1);

        console.log(chalk.bgWhite.black('Sorted by subgroup'));
        this._print(data, [1, 2]);

        console.log(chalk.bgWhite.black('Sorted by pid'));
        this._print(data, [1, 0]);

        console.log((new Array((process.stdout.columns || 80) + 1)).join(figure.line));
        console.log(chalk.white(`Process finished in ${chalk.bold(prettyMs(Date.now() - this.processStart))}.`));
    }
}

module.exports = CliPrinter;
