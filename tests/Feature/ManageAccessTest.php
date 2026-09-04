<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
