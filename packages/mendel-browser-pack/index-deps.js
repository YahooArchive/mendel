/**
 * Modules internal to a bundle can be referenced by index instead of id.
 * Remap ids and deps in such case.
 * @example
 * This compresses the bundle by renaming all dependency indexes from file paths
 * to a numbered index.
 *
 * Here is a sample transformation:
 * ```js
 * [
 *   {
 *     "entry": true,
 *     "id": "/User/me/projects/site/src/main.js",
 *     "deps": {
 *       "./colors.js": "/User/me/projects/site/src/colors.js",
 *       "./shared.js": "/User/me/projects/site/src/shared.js"
 *     }
 *   },
 *   {
 *     "id": "/User/me/projects/site/src/colors.js",
 *     "deps": {
 *       "external-lib": false
 *     }
 *   },
 *   {
 *     "expose": "shared",
 *     "id": "/User/me/projects/site/src/shared.js",
 *     "deps": {}
 *   }
 * ]
 * ```
 *
 * Should become:
 * ```js
 * [
 *   {
 *     "entry": true,
 *     "id": 1,
 *     "deps": {
 *       "./colors.js": 2,
 *       "./shared.js": "shared"
 *     }
 *   },
 *   {
 *     "id": 2,
 *     "deps": {
 *       "external-lib": false
 *     }
 *   },
 *   {
 *     "expose": "shared",
 *     "id": "shared",
 *     "deps": {}
 *   }
 * ]
 * ```
 */
module.exports = function indexedDeps(mods) {
    // the index can't be ever 0 because 0 is false for browserify
    var newModIndex = [0];

    // indexes are created first, because deps can come unordered
    mods.forEach(function(mod){
        if (!mod.expose) newModIndex.push(mod.id);
    });

    // create a new array of modified modules
    return mods.map(function(oldMod) {
        return Object.keys(oldMod).reduce(function(newMod, prop) {

            if (prop === 'deps') { // deps needs to be reindexed
                newMod.deps = Object.keys(oldMod.deps).reduce(
                    function(newDeps, name) {
                        var id = oldMod.deps[name];
                        var index = newModIndex.indexOf(id);
                        if (index > -1) {
                            newDeps[name] = index;
                        } else {
                            // deps not indexed are exposed or external
                            newDeps[name] = id;
                        }
                        return newDeps;
                    },
                {});
            }


            else if(prop === 'id') { // id needs to be reindexed
                var index = newModIndex.indexOf(oldMod.id);
                if (index > -1) {
                    newMod.id = index;
                } else {
                    // unless it is entry or exposed
                    newMod.id = oldMod.expose || oldMod.id;
                }
            }

            else {
                // for all other props we just copy over
                newMod[prop] = oldMod[prop];
            }

            return newMod;
        }, {});
    });
}
