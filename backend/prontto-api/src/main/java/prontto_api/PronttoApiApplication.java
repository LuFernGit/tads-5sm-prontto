package prontto_api;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

// @EnableScheduling liga as tarefas automáticas (ex.: AgendamentoAutoCancelamentoJob).
@SpringBootApplication
@EnableScheduling
public class PronttoApiApplication {

	public static void main(String[] args) {
		SpringApplication.run(PronttoApiApplication.class, args);
	}

}
