<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contractor_portfolios', function (Blueprint $table) {
            $table->bigIncrements('portfolio_id');
            $table->unsignedBigInteger('contractor_id');
            $table->string('project_title');
            $table->text('description');
            $table->date('completion_date');
            $table->timestamp('created_at');

            // Foreign key
            $table->foreign('contractor_id')
                ->references('contractor_id')
                ->on('contractors')
                ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contractor_portfolios');
    }
};
