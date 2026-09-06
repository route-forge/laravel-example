<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Route;
use Tests\TestCase;

/**
 * 管理端准入：会话 + is_manager 两道门，全程 JSON（后端是纯 API）。
 *
 * 路由契约（routes/api.php）：
 *   - 登录   POST /api/auth/login        （level: public，挂 web 会话层）
 *   - 登出   POST /api/manage/auth/logout（level: manage）
 *   - 业务   /api/manage/*                （level: manage，web + manage 双中间件）
 */
class ManageAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_未登录调用管理接口返回四零一(): void
    {
        $this->getJson('/api/manage/catalogs')->assertUnauthorized();
        $this->postJson('/api/manage/catalogs', [])->assertUnauthorized();
        $this->getJson('/api/manage/bootstrap')->assertUnauthorized();
    }

    public function test_未登录读不到管理层级明细端点(): void
    {
        // endpoint_middleware：未登录者连「后台有哪些路由」都拿不到
        $this->getJson('/_forge/routes/manage')->assertUnauthorized();
    }

    public function test_管理层级明细端点声明会话与准入双中间件(): void
    {
        // 「后台无法启动」事故锚点：登录成功后 SPA 会 GET /_forge/routes/manage 懒加载层级明细，
        // 该端点若只挂 manage 不挂 web（没有 StartSession），任何登录态都解析不出会话用户 → 恒 401，
        // 401 兜底再把人踢回登录页，形成死循环。
        // 刻意断言注册结果而非发真实请求：测试容器的 session 管理器跨请求共享，守卫即便重建也
        // 读得到登录写入的会话，复现不了浏览器「只带 cookie」的链路，行为测试对缺 web 是假阴性。
        $route = collect($this->app['router']->getRoutes()->getRoutes())
            ->first(fn (Route $r) => $r->uri() === '_forge/routes/manage');

        $this->assertNotNull($route, '未注册 manage 层级明细端点');

        $middleware = (array) ($route->getAction('middleware') ?? []);
        $this->assertContains('web', $middleware, '明细端点缺 web（StartSession）→ 登录态恒 401，后台陷入踢回登录页死循环');
        $this->assertContains('manage', $middleware);
    }

    public function test_非管理员登录后仍是四零三(): void
    {
        $user = User::factory()->create(['is_manager' => false]);

        $this->actingAs($user)->getJson('/api/manage/catalogs')->assertForbidden();
    }

    public function test_登录校验与错误口令都是四二二(): void
    {
        $this->postJson('/api/auth/login', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['email', 'password']);

        User::factory()->create([
            'email'      => 'pw@forge.example',
            'password'   => 'secret123',
            'is_manager' => true,
        ]);

        $this->postJson('/api/auth/login', ['email' => 'pw@forge.example', 'password' => 'wrong'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('email');

        $this->assertGuest();
    }

    public function test_非管理员口令正确也登不进(): void
    {
        User::factory()->create([
            'email'      => 'staff@forge.example',
            'password'   => 'secret123',
            'is_manager' => false,
        ]);

        $this->postJson('/api/auth/login', ['email' => 'staff@forge.example', 'password' => 'secret123'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('email');

        $this->assertGuest();
    }

    public function test_登录成功写入会话并可访问接口(): void
    {
        $manager = User::factory()->create([
            'email'      => 'in@forge.example',
            'password'   => 'secret123',
            'is_manager' => true,
        ]);

        $this->postJson('/api/auth/login', ['email' => 'in@forge.example', 'password' => 'secret123'])
            ->assertOk()
            ->assertJsonPath('user.email', 'in@forge.example');

        $this->assertAuthenticatedAs($manager);
        $this->getJson('/api/manage/bootstrap')->assertOk();
        $this->getJson('/api/manage/catalogs')->assertOk();
    }

    public function test_登出后接口重新变四零一(): void
    {
        $this->actingAs($this->manager());

        $this->postJson('/api/manage/auth/logout')->assertOk();
        $this->assertGuest();

        $this->getJson('/api/manage/catalogs')->assertUnauthorized();
    }

    private function manager(): User
    {
        return User::factory()->create(['is_manager' => true]);
    }
}
