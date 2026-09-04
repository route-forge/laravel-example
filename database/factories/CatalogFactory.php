<?php

namespace Database\Factories;

use App\Models\Catalog;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Catalog>
 */
class CatalogFactory extends Factory
{
    protected $model = Catalog::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        // slug 从 title 派生：unique() 保证 sentence 唯一，slug 随之唯一，
        // 且与真实业务「slug 是标题的 URL 化」一致（fake()->slug 的参数是
        // 分隔符不是文本，传句子进去会崩）
        $title = rtrim(fake()->unique()->sentence(3), '.');

        return [
            'slug'         => Str::slug($title),
            'title'        => $title,
            'subtitle'     => fake()->sentence(6),
            'cover_image'  => null,
            'theme_color'  => fake()->hexColor(),
            'summary'      => fake()->paragraph(),
            'status'       => Catalog::STATUS_DRAFT,
            'published_at' => null,
            'sort_order'   => fake()->numberBetween(0, 99),
        ];
    }

    /**
     * 已发布：前台与公开 API 可见。
     */
    public function published(): static
    {
        return $this->state([
            'status'       => Catalog::STATUS_PUBLISHED,
            'published_at' => fake()->dateTimeBetween('-1 year', 'now'),
        ]);
    }
}
