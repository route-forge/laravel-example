<?php

namespace Tests\Feature;

use Tests\TestCase;

/**
 * SPA 唯一 Blade 壳的契约测试。
 *
 * 只跑 `vite build` 测不到的一类问题：dev-only 的 script 注入顺序。生产构建把整段裁掉，
 * 所以必须在这里用「临时 hot 文件」把 dev 形态钉住。
 */
class SpaShellTest extends TestCase
{
    public function test_dev态壳内必须先行注入reactfastrefreshpreamble(): void
    {
        $hot = public_path('hot');
        $existed = is_file($hot);
        $backup = $existed ? file_get_contents($hot) : null;

        // vite dev 启动时会写 public/hot（内容为 dev server origin）；测试里手工造一个，
        // 结束务必还原 —— 否则会污染本机正在跑的 dev 解析。
        file_put_contents($hot, 'http://127.0.0.1:5199');

        try {
            $html = $this->get('/')->assertOk()->content();

            $this->assertStringContainsString('http://127.0.0.1:5199/@react-refresh', $html);
            $this->assertStringContainsString('window.$RefreshReg$', $html);

            // 顺序契约：module 脚本按文档顺序求值，preamble 晚于 app.jsx 就等于没注入。
            $preambleAt = strpos($html, '$RefreshReg$');
            $entryAt = strpos($html, 'resources/js/app.jsx');
            $this->assertLessThan($entryAt, $preambleAt, 'preamble 必须排在 app.jsx 之前');
        } finally {
            if ($existed) {
                file_put_contents($hot, $backup);
            } else {
                @unlink($hot);
            }
        }
    }

    public function test_生产态无hot文件时不注入preamble(): void
    {
        $hot = public_path('hot');
        $existed = is_file($hot);
        $backup = $existed ? file_get_contents($hot) : null;

        if ($existed) {
            @unlink($hot); // 模拟无 dev server 的构建产物形态
        }

        try {
            $this->get('/')->assertOk()->assertDontSee('react-refresh', false);
        } finally {
            if ($existed) {
                file_put_contents($hot, $backup);
            }
        }
    }
}
