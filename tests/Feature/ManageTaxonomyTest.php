<?php

namespace Tests\Feature;

use App\Models\Catalog;
use App\Models\Category;
use App\Models\SiteSetting;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * 管理端「分类」与「基础资料」维护：CRUD、排序、以及公开侧的联动可见性。
 */
class ManageTaxonomyTest extends TestCase
{
    use RefreshDatabase;

    public function test_未登录的分类与基础资料写接口都是四零一(): void
    {
        $this->getJson('/api/manage/categories')->assertUnauthorized();
        $this->postJson('/api/manage/categories', ['name' => 'x', 'slug' => 'x'])->assertUnauthorized();
        $this->putJson('/api/manage/site', ['site_name' => 'x'])->assertUnauthorized();
    }

    public function test_非管理员写接口都是四零三(): void
    {
        $this->actingAs(User::factory()->create(['is_manager' => false]));

        $this->getJson('/api/manage/categories')->assertForbidden();
        $this->putJson('/api/manage/site', ['site_name' => 'x'])->assertForbidden();
    }

    public function test_管理员创建分类后公开侧立即可见(): void
    {
        $this->actingAs($this->manager());

        $this->postJson('/api/manage/categories', ['name' => '客户案例', 'slug' => 'cases'])
            ->assertCreated()
            ->assertJsonPath('data.slug', 'cases');

        $this->getJson('/api/categories')
            ->assertOk()
            ->assertJsonPath('data.0.name', '客户案例');
    }

    public function test_分类slug唯一与格式校验(): void
    {
        Category::query()->create(['name' => '已有', 'slug' => 'taken']);

        $this->actingAs($this->manager());

        $this->postJson('/api/manage/categories', ['name' => '新分类', 'slug' => 'Taken 1'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('slug');

        $this->postJson('/api/manage/categories', ['name' => '新分类', 'slug' => 'taken'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('slug');
    }

    public function test_删除分类后画册回到未分类且公开接口不再挂分类(): void
    {
        $manager = $this->manager();
        $category = Category::query()->create(['name' => '产品', 'slug' => 'products']);
        $catalog = Catalog::factory()->published()->create(['category_id' => $category->id]);

        $this->actingAs($manager)
            ->deleteJson("/api/manage/categories/{$category->id}")
            ->assertOk();

        $this->assertModelMissing($category);
        $this->assertNull($catalog->fresh()->category_id);

        // 公开详情不再带分类
        $this->getJson("/api/catalogs/{$catalog->slug}")
            ->assertOk()
            ->assertJsonPath('data.category', null);
    }

    public function test_分类拖拽排序按ids顺序重排(): void
    {
        $a = Category::query()->create(['name' => 'A', 'slug' => 'a']);
        $b = Category::query()->create(['name' => 'B', 'slug' => 'b']);
        $c = Category::query()->create(['name' => 'C', 'slug' => 'c']);

        $this->actingAs($this->manager())
            ->postJson('/api/manage/categories/reorder', ['ids' => [$c->id, $a->id, $b->id]])
            ->assertOk();

        $orders = Category::query()->orderBy('sort_order')->pluck('id')->all();
        $this->assertSame([$c->id, $a->id, $b->id], $orders);
    }

    public function test_公开列表可按分类筛选且分类计数只算已发布(): void
    {
        $products = Category::query()->create(['name' => '产品手册', 'slug' => 'products']);
        Catalog::factory()->published()->create(['category_id' => $products->id]);
        Catalog::factory()->published()->create(['category_id' => $products->id]);
        Catalog::factory()->create(['slug' => 'draft-in-cat', 'category_id' => $products->id]);
        Catalog::factory()->published()->create();

        $this->getJson('/api/categories?')->assertOk();
        $categories = $this->getJson('/api/categories')->json('data');
        $this->assertSame(2, $categories[0]['published_count']);

        // 分类筛选：只有挂在 products 下的已发布画册
        $slugs = collect($this->getJson('/api/catalogs?category=products')
            ->assertOk()
            ->json('data'))->pluck('slug')->all();
        $this->assertNotContains('draft-in-cat', $slugs);
        $this->assertSame(2, $this->getJson('/api/catalogs?category=products')->json('meta.total'));
    }

    public function test_基础资料默认行可公开读取且管理端可整体更新(): void
    {
        // 迁移自带默认行，公开接口永不空态
        $this->getJson('/api/site')
            ->assertOk()
            ->assertJsonPath('data.site_name', '我的企业');

        $this->actingAs($this->manager())
            ->putJson('/api/manage/site', [
                'site_name'      => '星野智能',
                'brand_slogan'   => '把数据变成判断',
                'contact_email'  => 'not-an-email',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('contact_email');

        $this->actingAs($this->manager())
            ->putJson('/api/manage/site', [
                'site_name'      => '星野智能',
                'brand_slogan'   => '把数据变成判断',
                'contact_email'  => 'hello@xingye.example',
                'contact_phone'  => '400-000-0000',
            ])
            ->assertOk()
            ->assertJsonPath('data.site_name', '星野智能');

        $this->assertSame('星野智能', SiteSetting::current()->site_name);
        $this->getJson('/api/site')->assertJsonPath('data.brand_slogan', '把数据变成判断');
    }

    private function manager(): User
    {
        return User::factory()->create(['is_manager' => true]);
    }
}
