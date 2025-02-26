# npm-mine

Script to mine the NPM registry for packages **including a GitHub repository URL** via the `replicate.npmjs.com` couchDB database.

The script uses the `https://replicate.npmjs.com/_all_docs?include_docs=true` endpoint, using pagination.

A dump of the dataset (as of 20th of February 2025) is available on Zenodo (21.7GB, 108GB unzipped, 1,900,347 entries): [Zenodo Link](10.5281/zenodo.14914148)

Due to the size of the data, the dataset is restricted to only NPM packages that list a GitHub repository (broadly, `repository`     exists, and `repository` string or `repository['url']` string include the substring github), 1,900,347 of 3,450,250 total entries at the time of mining. This constitutes a subset of the NPM ecosystem of interest to SE researchers.

|Packages | Count |
|-|-|
| On NPM as of 20/2/2025 | 3,450,250
| With a GitHub Repository URL | 1,900,347


### Data Structure

The dataset is stored as a JSON array of registry records, matching the data found for example at: `https://registry.npmjs.org/mocha`

```json
[
    {
        "_id": "mocha",
        "_rev": "1303-c8b2efea776f71072dd27bb904c0fd46",
        "name": "mocha",
        "dist-tags:" {...}
        ...etc
    },
    ...etc
]
```

`example.js` includes an example of how to read the data in Node.js via JSON streaming. Other languages are likely to have similar utilities.

## Install

Clone and run `npm install` to install dependencies.

## Usage

```sh
node mine
```

## Caveats

Sometimes the download stream errors silently. This is more likely the larger the pagination size is (likely due to the connection to the database failing?). You may have to adjust the pagination size during mining using the `limit` variable. **If you know a solution, or see an issue with the streaming logic, please let me know!** Without being able to detect the error, I can't run this entirely automatically. If I could detect the error, I could algorithmically retry the download with smaller page sizes. So you may need to babysit this script quite a bit.

Using the `start_key` field, you can resume the mining process from the last failed page using the package name.

You may have to use the `checkFileEnd` function to quickly see the last previous entry in the file, due to its size. For example, if the last package was ``-``, you can use the link: ```https://replicate.npmjs.com/_all_docs?include_docs=true&limit=2&startkey=%22-%22``` to see the name of the next package.

The exact number of packages actually hosted on GitHub may differ, as the filtering here is only intended to catch the widest ammount possible to filter the dataset down in size somewhat. If you use the GitHub API, you will see that at least some URLs do not resolve, or appear to be copied from another project. The substring search may also include, for example, a package hosted elsewhere with 'github' in the name.