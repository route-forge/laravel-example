<?php

namespace Tests\Feature;

// use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    /**
     * A basic test example.
     */
    public function test_the_application_returns_a_successful_response(): void
    {
        // Blade 壳里的 @vite 指向前端构建产物，测试环境不构建，跳过即可；
        // 壳页本身的完整行为（forge 摘要注入）由 ForgeMetadataTest 覆盖
        $response = $this->withoutVite()->get('/');

        $response->assertStatus(200);
    }
}
