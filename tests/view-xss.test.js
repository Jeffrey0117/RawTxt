// Regression: markdown pastes must not execute HTML/JS embedded in the paste.
// Renders the real view page in headless Chrome and checks the resulting DOM.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { buildViewPage } from '../src/routes/view.js'

const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const noChrome = !existsSync(CHROME)

function renderDom(content) {
  const html = buildViewPage({ id: 'test', content, content_type: 'markdown' }, 'http://localhost')
  const dir = mkdtempSync(join(tmpdir(), 'rawtxt-xss-'))
  const file = join(dir, 'page.html')
  writeFileSync(file, html)
  const r = spawnSync(CHROME, ['--headless=new', '--disable-gpu', `--user-data-dir=${join(dir, 'prof')}`,
    '--virtual-time-budget=5000', '--dump-dom', pathToFileURL(file).href], { encoding: 'utf8', timeout: 60000 })
  return r.stdout
}

const renderedContent = (dom) => (dom.split('id="content"')[1] || '').split('</div>')[0]

test('markdown paste with inline event handler does not run script', { skip: noChrome }, () => {
  const dom = renderDom('# hi\n\n<img src=x onerror="document.body.setAttribute(\'data-pwned\',\'1\')">')
  assert.match(dom, /<h1[^>]*>hi<\/h1>/, 'markdown should still render')
  assert.doesNotMatch(dom, /<body[^>]*data-pwned/, 'onerror handler executed: stored XSS')
})

test('markdown paste cannot inject javascript: links', { skip: noChrome }, () => {
  const dom = renderDom('ok\n\n<a id="evil" href="javascript:alert(1)">click</a>')
  assert.doesNotMatch(renderedContent(dom), /href="javascript:/i, 'javascript: link survived rendering')
})
