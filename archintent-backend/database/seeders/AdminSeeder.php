<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create admin user
        User::create([
            'full_name' => 'Admin User',
            'email' => 'admin@archintent.com',
            'password_hash' => Hash::make('Admin123456!'),
            'role' => 'admin',
            'account_status' => 'active',
        ]);

        echo "✓ Admin user created successfully!\n";
        echo "  Email: admin@archintent.com\n";
        echo "  Password: Admin123456!\n";
    }
}
