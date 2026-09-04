<?php

namespace Database\Factories;

use App\Models\ContactMessage;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ContactMessage>
 */
class ContactMessageFactory extends Factory
{
    protected $model = ContactMessage::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name'    => fake()->name(),
            'email'   => fake()->unique()->safeEmail(),
            'phone'   => fake()->optional()->phoneNumber(),
            'company' => fake()->optional()->company(),
            'subject' => fake()->optional()->sentence(4),
            'message' => fake()->paragraph(2),
            'status'  => 'new',
        ];
    }
}
