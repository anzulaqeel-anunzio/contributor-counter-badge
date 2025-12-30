#!/usr/bin/env node
// Developed for Anunzio International by Anzul Aqeel. Contact +971545822608 or +971585515742. Linkedin Profile: linkedin.com/in/anzulaqeel

/*
 * Developed for Anunzio International by Anzul Aqeel
 * Contact +971545822608 or +971585515742
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const chalk = require('chalk');
const { badgen } = require('badgen');
const { program } = require('commander');

program
    .version('1.0.0')
    .argument('<repo>', 'GitHub repository (owner/repo)')
    .option('-o, --output <file>', 'Output file', 'badge.svg')
    .option('--label <text>', 'Badge label', 'Contributors')
    .option('--color <color>', 'Badge color', 'blue')
    .action((repo, options) => {
        run(repo, options);
    });

program.parse(process.argv);

async function run(repoSlug, options) {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
        console.warn(chalk.yellow('Warning: GITHUB_TOKEN not set. API rate limits will be low and contributor lists might be truncated.'));
    }

    // GitHub API for contributors is paginated. To get the count accurately without pagination loop (expensive),
    // we can use a trick: `per_page=1&anon=true` and read the Link header for last page number.
    // OR we can just fetch the first page.
    // For small repos, fetching length is fine. For huge ones, the Link header method is standard.

    try {
        console.log(chalk.blue(`Fetching contributor count for ${repoSlug}...`));

        const res = await axios.get(`https://api.github.com/repos/${repoSlug}/contributors?per_page=1&anon=true`, {
            headers: token ? { Authorization: `token ${token}` } : {}
        });

        let count = 0;
        const linkHeader = res.headers['link'];

        if (linkHeader) {
            // Parse link header to find the "last" page
            // <https://api.github.com/...&page=123>; rel="last"
            const match = linkHeader.match(/&page=(\d+)>; rel="last"/);
            if (match) {
                count = parseInt(match[1]);
            } else {
                // Should not happen if there are more pages, but if only 1 page...
                count = 1; // At least one if request succeeded?
                // Actually if no link header, it means results fit in one page (which is 1 here).
                // Wait, if per_page=1, almost always >1 contributor? 

                // If there's no link header with per_page=1, it means total count <= 1.
                // We can verify by checking res.data length.
                count = res.data.length;
            }
        } else {
            count = res.data.length;
        }

        console.log(chalk.cyan(`Found ${count} contributors.`));

        const svgString = badgen({
            label: options.label,
            status: count.toString(),
            color: options.color,
            style: 'flat'
        });

        const outputPath = path.resolve(process.cwd(), options.output);
        fs.writeFileSync(outputPath, svgString);
        console.log(chalk.green(`Badge generated: ${outputPath}`));

    } catch (error) {
        console.error(chalk.red(`Error: ${error.message}`));
        if (error.response && error.response.status === 403) {
            console.error(chalk.yellow('Rate limit exceeded. Provide GITHUB_TOKEN via env vars.'));
        }
        process.exit(1);
    }
}

// Developed for Anunzio International by Anzul Aqeel. Contact +971545822608 or +971585515742. Linkedin Profile: linkedin.com/in/anzulaqeel
