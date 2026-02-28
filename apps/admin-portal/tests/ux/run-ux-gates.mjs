import { readFile } from 'fs/promises';
import path from 'path';
import { spawnSync } from 'child_process';

const root = process.cwd();

const failures = [];

function check(condition, message, details = undefined) {
    if (!condition) {
        failures.push({ message, details });
        return;
    }
    console.log(`PASS: ${message}`);
}

async function readUtf8(relativePath) {
    const absolutePath = path.resolve(root, relativePath);
    return readFile(absolutePath, 'utf8');
}

function runDesignTokenLint() {
    const child = spawnSync('node', ['./scripts/check-design-tokens.mjs'], {
        cwd: root,
        stdio: 'inherit',
        shell: false,
    });

    check(child.status === 0, 'Design token lint passes');
}

function requiredSetIncludes(actual, required, label) {
    for (const value of required) {
        check(actual.includes(value), `${label} includes ${value}`, { actual, missing: value });
    }
}

async function checkNavigationAndLayout() {
    const navSource = await readUtf8('src/components/layout/navigation.ts');
    const layoutSource = await readUtf8('src/app/dashboard/layout.tsx');

    const sectionRegex = /\{\s*label:\s*'([^']+)'\s*,\s*items:/g;
    const sections = [];
    let match;
    while ((match = sectionRegex.exec(navSource)) !== null) {
        sections.push(match[1]);
    }

    const expectedSections = ['Operations', 'Security', 'Workspace', 'Revenue', 'Documentation'];
    check(sections.length >= expectedSections.length, 'Sidebar defines grouped sections', { sections });
    requiredSetIncludes(sections, expectedSections, 'Sidebar sections');

    check(navSource.includes('canAccessNavItem('), 'Navigation exposes role-aware access helper');
    check(
        navSource.includes("roles?: UserRole[]"),
        'Navigation metadata supports role-scoped visibility'
    );

    check(
        layoutSource.includes("aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}"),
        'Sidebar collapse/expand button has aria label'
    );
    check(layoutSource.includes('aria-label="Open menu"'), 'Mobile menu trigger has aria label');
    check(layoutSource.includes('aria-label="Sign out"'), 'Logout action has aria label');
    check(layoutSource.includes('aria-label="Active project"'), 'Project selector has aria label');
}

async function checkUxContracts() {
    const accessibilityChecklistRaw = await readUtf8('tests/ux/accessibility-checklist.json');
    const viewportMatrixRaw = await readUtf8('tests/ux/viewport-matrix.json');
    const visualBaselinesRaw = await readUtf8('tests/ux/visual-baselines.json');

    const accessibilityChecklist = JSON.parse(accessibilityChecklistRaw);
    const viewportMatrix = JSON.parse(viewportMatrixRaw);
    const visualBaselines = JSON.parse(visualBaselinesRaw);

    const requiredA11yGates = [
        'A11Y-KEYBOARD-001',
        'A11Y-FOCUS-002',
        'A11Y-CONTRAST-003',
        'A11Y-ARIA-004',
    ];
    const a11yGateIds = (accessibilityChecklist.gates || []).map((gate) => gate.id);
    requiredSetIncludes(a11yGateIds, requiredA11yGates, 'Accessibility gates');
    check(
        (accessibilityChecklist.gates || []).every((gate) => gate.status === 'required'),
        'All accessibility gates are marked as required'
    );

    const requiredViewports = ['mobile-small', 'mobile-large', 'tablet', 'laptop', 'desktop', 'ultrawide'];
    const viewportNames = (viewportMatrix.targets || []).map((target) => target.name);
    requiredSetIncludes(viewportNames, requiredViewports, 'Viewport matrix');

    const requiredFlows = [
        'dashboard-shell-navigation',
        'project-switcher-selection',
        'account-actions-and-logout',
        'api-key-rotate-promote-revoke',
        'security-whitelist-crud',
    ];
    const flowNames = viewportMatrix.critical_flows || [];
    requiredSetIncludes(flowNames, requiredFlows, 'Critical UX flows');

    const requiredBaselines = [
        'dashboard-shell-expanded',
        'dashboard-shell-collapsed',
        'dashboard-shell-mobile-menu',
        'dashboard-project-switcher',
        'dashboard-account-block',
    ];
    const baselineNames = visualBaselines.baselines || [];
    requiredSetIncludes(baselineNames, requiredBaselines, 'Visual baseline contracts');
}

async function run() {
    console.log('Running admin portal UX gates...');
    runDesignTokenLint();
    await checkNavigationAndLayout();
    await checkUxContracts();

    if (failures.length > 0) {
        console.error('\nUX gate failures:');
        for (const failure of failures) {
            console.error(`- ${failure.message}`);
            if (failure.details) {
                console.error(`  details: ${JSON.stringify(failure.details)}`);
            }
        }
        process.exit(1);
    }

    console.log('\nAll UX gates passed.');
}

run().catch((error) => {
    console.error('UX gate runner failed:', error);
    process.exit(1);
});
