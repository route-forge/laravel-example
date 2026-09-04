<?php

namespace Database\Factories;

use App\Models\Category;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Category>
 */
class CategoryFactory extends Factory
{
    protected $model = Category::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        // name 唯一 → slug 随之唯一（与 CatalogFactory 同一口径）
        $name = fake()->unique()->word();

        return [
            'name'       => $name,
            'slug'       => Str::slug($name) ?: 'cat-'.Str::random(6),
            'sort_order' => fake()->numberBetween(0, 9),
        ];
    }
}
