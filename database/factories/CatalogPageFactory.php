<?php

namespace Database\Factories;

use App\Models\Catalog;
use App\Models\CatalogPage;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CatalogPage>
 */
class CatalogPageFactory extends Factory
{
    protected $model = CatalogPage::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'catalog_id' => Catalog::factory(),
            'sort_order' => fake()->numberBetween(1, 12),
            'title'      => fake()->words(3, true),
            'body'       => fake()->paragraph(3),
            'image'      => null,
            'layout'     => 'text',
            'tone'       => 'light',
        ];
    }
}
