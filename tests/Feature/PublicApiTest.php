<?php

namespace Tests\Feature;

use App\Models\Catalog;
use App\Models\CatalogPage;
use App\Models\Category;
use App\Models\ContactMessage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * 公开数据接口（level: public）：前台组件唯一的取数入口。
 */
class PublicApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_列表只返回已发布且带页数(): void
    {
        $published = Catalog::factory()->published()->create();
        CatalogPage::factory()->count(2)->create(['catalog_id' => $published->id]);
        Catalog::factory()->create(['slug' => 'still-draft']);

        $response = $this->getJson('/api/catalogs')->assertOk();

        $slugs = collect($response->json('data'))->pluck('slug')->all();

        $this->assertSame([$published->slug], $slugs);
        $this->assertSame(2, $response->json('data.0.page_count'));
        $this->assertSame(1, $response->json('meta.total'));
        $this->assertArrayNotHasKey('pages', $response->json('data.0'), '列表不应带整本页面');
    }

    public function test_列表与详情都带归属分类(): void
    {
        $category = Category::query()->create(['name' => '公司宣传', 'slug' => 'company']);
        $catalog = Catalog::factory()->published()->create(['category_id' => $category->id]);

        $this->getJson('/api/catalogs')
            ->assertOk()
            ->assertJsonPath('data.0.category.slug', 'company');

        $this->getJson("/api/catalogs/{$catalog->slug}")
            ->assertOk()
            ->assertJsonPath('data.category.name', '公司宣传');
    }

    public function test_站点基础资料可公开读取(): void
    {
        $this->getJson('/api/site')
            ->assertOk()
            ->assertJsonPath('data.site_name', '我的企业');
    }

    public function test_详情按页序返回整本内容(): void
    {
        $catalog = Catalog::factory()->published()->create();
        CatalogPage::factory()->create(['catalog_id' => $catalog->id, 'sort_order' => 2, 'title' => '第二页']);
        CatalogPage::factory()->create(['catalog_id' => $catalog->id, 'sort_order' => 1, 'title' => '第一页']);

        $titles = collect($this->getJson("/api/catalogs/{$catalog->slug}")
            ->assertOk()
            ->json('data.pages'))->pluck('title')->all();

        $this->assertSame(['第一页', '第二页'], $titles);
    }

    public function test_草稿与不存在的画册都是_404(): void
    {
        $draft = Catalog::factory()->create(['slug' => 'draft-only']);

        $this->getJson('/api/catalogs/draft-only')->assertNotFound();
        $this->getJson('/api/catalogs/nope')->assertNotFound();
    }

    public function test_留言提交后落库(): void
    {
        $payload = [
            'name'    => '王小明',
            'email'   => 'wang@example.com',
            'company' => '示例制造',
            'subject' => '咨询画册合作',
            'message' => '我们想做一本年度画册，想了解周期与报价。',
        ];

        $this->postJson('/api/contact', $payload)->assertCreated();

        $this->assertDatabaseHas('contact_messages', [
            'email'  => 'wang@example.com',
            'status' => 'new',
        ]);
    }

    public function test_留言校验规则与服务端一致(): void
    {
        $this->postJson('/api/contact', ['name' => '', 'email' => 'nope', 'message' => '短'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'email', 'message']);

        $this->assertSame(0, ContactMessage::query()->count());
    }
}
