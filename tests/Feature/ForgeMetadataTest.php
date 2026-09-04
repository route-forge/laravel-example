<?php

namespace Tests\Feature;

use App\Models\Catalog;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Route as RouteFacade;
use RouteForge\Laravel\Exceptions\RouteTierNotAssignedException;
use RouteForge\Laravel\RouteRepository;
use Tests\TestCase;

/**
 * route-forge 契约层：内嵌摘要、摘要端点、层级端点的可见性，以及类型生成命令。
 */
class ForgeMetadataTest extends TestCase
{
    use RefreshDatabase;

    public function test_内嵌摘要只带层级索引不带路由明细(): void
    {
        Catalog::factory()->published()->create(['slug' => 'embedded-check']);

        // Blade 壳里的 @vite 与本测试无关（构建产物不进测试环境）
        $html = $this->withoutVite()->get('/')->assertOk()->getContent();

        $this->assertSame(1, substr_count($html, '<script>'), '@forgeSummary 应只产出一段脚本');
        $this->assertStringContainsString("Object.defineProperty(window, '__ROUTE_FORGE__'", $html);
        $this->assertStringContainsString('enumerable: false', $html);
        // Js::from 会把 JSON 的双引号转义成 \u0022，按转义形态断言 schemeVersion 键存在
        $this->assertStringContainsString('\u0022schemeVersion\u0022:1', $html);

        // 红线：明细走懒加载，绝不提前塞进公开 HTML
        $this->assertStringNotContainsString('embedded-check', $html);
        $this->assertStringNotContainsString('catalogs/{slug}', $html);
    }

    public function test_摘要端点返回两个层级与端点自描述(): void
    {
        $summary = $this->getJson('/_forge/routes')
            ->assertOk()
            ->assertJsonStructure([
                'schemeVersion',
                'levels' => ['public', 'manage', 'unassigned'],
                'config' => ['strict_mode', 'endpoint_prefix', 'url_prefix', 'cache_ttl'],
            ])
            ->json();

        $this->assertSame(1, $summary['schemeVersion']);
        $this->assertSame('/_forge/routes', $summary['config']['endpoint_prefix']);
        $this->assertTrue($summary['config']['strict_mode']);
        $this->assertSame('eager', $summary['levels']['public']['load']);
        $this->assertSame('lazy', $summary['levels']['manage']['load']);
        $this->assertSame('/_forge/routes/public', $summary['levels']['public']['route']['uri']);
        // 壳页 index/fallback + 公开 API 三条 + 登录
        $this->assertGreaterThanOrEqual(6, $summary['levels']['public']['route_count']);
    }

    public function test_公开层级明细可读且含站点路由(): void
    {
        $routes = $this->getJson('/_forge/routes/public')
            ->assertOk()
            ->assertJsonPath('level', 'public')
            ->json('routes');

        $this->assertArrayHasKey('api.catalogs.show', $routes);
        $this->assertSame(['slug'], $routes['api.catalogs.show']['parameters']);
        $this->assertArrayHasKey('api.auth.login', $routes, '登录接口必须对未登录者可见');
        $this->assertArrayNotHasKey('api.manage.catalogs.index', $routes);
    }

    public function test_管理层级明细未登录时四零一(): void
    {
        $this->getJson('/_forge/routes/manage')->assertUnauthorized();
    }

    public function test_登录管理员后可读到管理层级明细(): void
    {
        $this->actingAs(User::factory()->create(['is_manager' => true]));

        $routes = $this->getJson('/_forge/routes/manage')->assertOk()->json('routes');

        $this->assertArrayHasKey('api.manage.catalogs.index', $routes);
        $this->assertArrayHasKey('api.manage.logout', $routes);
        $this->assertArrayNotHasKey('api.catalogs.show', $routes, '公开路由不应出现在管理层级');
    }

    public function test_严格模式下漏归级的命名路由直接抛异常(): void
    {
        RouteFacade::name('stray.route')->get('/stray', fn () => 'ok');

        $this->expectException(RouteTierNotAssignedException::class);

        app(RouteRepository::class)->getSummary();
    }

    public function test_类型生成命令产出两级映射与参数形状(): void
    {
        Artisan::call('route:forge:types');
        $output = Artisan::output();

        $this->assertStringContainsString('export type ForgeLevel = \'public\' | \'manage\';', $output);
        $this->assertStringContainsString('"api.catalogs.show"', $output);
        $this->assertStringContainsString('"api.manage.catalogs.update"', $output);
        $this->assertStringContainsString("declare module '@route-forge/core'", $output);
    }
}
