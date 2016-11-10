const BasePrinter = require('./printer');
const chalk = require('chalk');
const prettyMs = require('pretty-ms');
const figure = require('figures');

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

        this.nameMaxLen = options.nameMaxLen || 30;
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

                console.log(new Array(indentation + 1).join('  ') + chalk.underline(groupedName));
                this._print(dataPart, dimensions.slice(1), indentation + 1);
            });
        }

        // Group/aggregate the data
        const points = Object.keys(subData).map(groupedName => {
            const dataPart = subData[groupedName];

            // Special case: make the labels pretty!
            if (indentation === 0 && dimensions.length === 1 && dimension !== 1) {
                // Example: <pid> (groupNameA+groupNameB+groupNameC+etc…)
                const set = new Set();
                dataPart.forEach(p => set.add(p.name.split(':')[1]));
                const groupNames = Array.from(set.keys()).slice(0, 3).join('+') + (set.size > 3 ? '+etc…' : '');
                groupedName += ` (${groupNames})`;
            }
            const aggregate = dataPart.reduce((reduced, point) => reduced + point.after - point.before, 0);
            return {name: groupedName, aggregate};
        }).sort((a, b) => b.aggregate - a.aggregate);

        // Sum all time in this particular group for percentage
        const totalAggregateTime = points.reduce((reduced, {aggregate}) => reduced + aggregate, 0);

        // Textify
        const tabledText = points.map(({name, aggregate}) => {
            const percent = aggregate / totalAggregateTime * 100;
            // 7 for the time string, 4 for percent string, 3 to compensate for column char of the table
            const maxBarSize = (process.stdout.columns || 80) - this.nameMaxLen - 7 - 4 - 6;
            return [
                // maximum of 20
                padRight(new Array(indentation + 1).join('  ') + name.slice(0, this.nameMaxLen), this.nameMaxLen),
                // max of 7 characters
                padLeft(prettyMs(aggregate).slice(0, 7), 7),
                getBarText(percent, maxBarSize),
                // maximum of 4 character (number + '%')
                padLeft(`${Math.round(percent)}%`, 4),
            ].join('  ');
        }).join('\n');

        // Print the table!
        console.log(tabledText);
    }

    print(data) {
        console.log(chalk.bgWhite.black(padRight(' Sorted by grouping (aggregate of all thread)', process.stdout.columns || 80)));
        this._print(data, [1]);

        console.log(chalk.bgWhite.black(padRight(' Sorted by subgroup', process.stdout.columns || 80)));
        this._print(data, [1, 2]);

        console.log(chalk.bgWhite.black(padRight(' Sorted by pid', process.stdout.columns || 80)));
        this._print(data, [0]);

        console.log((new Array((process.stdout.columns || 80) + 1)).join(figure.line));
        console.log(chalk.white(`Process finished in ${chalk.bold(prettyMs(Date.now() - this.processStart))}.`));
    }
}

module.exports = CliPrinter;
