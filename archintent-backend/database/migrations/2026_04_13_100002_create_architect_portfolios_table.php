<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('architect_portfolios', function (Blueprint $table) {
            $table->id('architect_portfolio_id');
            $table->unsignedBigInteger('architect_id')->unique();
            $table->text('bio_statement')->nullable();
            $table->integer('total_projects_count')->default(0);
            $table->timestamps();

            $table->foreign('architect_id')->references('architect_id')->on('architects')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('architect_portfolios');
    }
};
